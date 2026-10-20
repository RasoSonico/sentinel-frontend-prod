import { useCallback, useMemo } from "react";
import { useQuery, useRealm } from "@realm/react";
import { uuid } from "expo-modules-core";

import {
  PendingReporteSubmission,
  PendingReporteStatus,
} from "src/realm/pendingReporte/PendingReporteSubmission";
import {
  PendingReportePhotoSubmission,
  PendingReportePhotoStatus,
} from "src/realm/pendingReporte/PendingReportePhotoSubmission";
import type { FotoReporte } from "src/types/reporte";

/**
 * Cola offline del reporte de actividades (ADR-006, Decisión 7).
 *
 * Espejo de `usePendingAdvanceQueue`. La forma del dato cambia; la mecánica
 * —encolar, marcar, completar de forma atómica— no.
 */

export interface ActividadEnCola {
  orden: number;
  texto: string;
}

export interface FotoEnCola {
  orden: number;
  pie: string;
  filename: string;
  localUri: string;
  fileSize: number;
  takenAt: Date;
}

export interface ReporteEnColaInput {
  constructionId: number;
  constructionName: string;
  /** Clave del área (`TOPOGRAFIA`, …). Obligatoria en el POST. */
  area: string;
  /** `YYYY-MM-DD` en día LOCAL. Ver D9 del ADR-003: nunca `toISOString()`. */
  fechaReporte: string;
  conclusion: string;
  actividades: ActividadEnCola[];
  fotos: FotoEnCola[];
  /** Contratistas Y supervisión: lo que el usuario palomeó en P-00. */
  proveedorIds: number[];
  contratistas: string[];
  supervision: string[];
}

const parse = <T,>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
};

export function usePendingReporteQueue() {
  const realm = useRealm();

  const allItems = useQuery(PendingReporteSubmission);
  const allPhotos = useQuery(PendingReportePhotoSubmission);

  const pendingItems = useMemo(
    () => allItems.filtered('status == "pending"').sorted("createdAt"),
    [allItems],
  );
  const syncingItems = useMemo(
    () => allItems.filtered('status == "syncing"'),
    [allItems],
  );
  const failedItems = useMemo(
    () => allItems.filtered('status == "failed"'),
    [allItems],
  );

  const pendingCount = pendingItems.length;
  const failedCount = failedItems.length;
  const syncingCount = syncingItems.length;
  const totalCount = pendingCount + failedCount + syncingCount;

  // ── Lectura para la UI ──────────────────────────────────────────────────

  /**
   * Los reportes que todavía viven solo en este teléfono, en la forma que la
   * lista de la obra necesita para fusionarlos con los del servidor.
   *
   * Existen SOLO en el dispositivo de su autor hasta que el servidor los tiene:
   * por eso la lista los pinta arriba con el chip "Por enviar" y con los
   * botones de generar apagados — no hay nada que generar todavía.
   *
   * **Los `done` SÍ salen aquí.** Un reporte que acaba de sincronizar todavía
   * no está en la respuesta del servidor —el refetch va en camino— y filtrarlo
   * lo haría desaparecer de la pantalla para reaparecer un instante después.
   * Se entregan con su `reporteId` para que quien fusiona pueda descartarlos en
   * cuanto el servidor los devuelva.
   */
  const reportesEnCola = useMemo(
    () => {
      // Un mapa en vez de filtrar dentro del `map`: con varios reportes en cola
      // recorrer todas las fotos por cada uno sería cuadrático para nada.
      const pendientesPorReporte = new Map<string, number>();
      for (const foto of allPhotos) {
        if (foto.status === "done") continue;
        pendientesPorReporte.set(
          foto.reporteLocalId,
          (pendientesPorReporte.get(foto.reporteLocalId) ?? 0) + 1,
        );
      }

      return [...allItems]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((item) => ({
          localId: item._id,
          reporteId: item.reporteId,
          constructionId: item.constructionId,
          constructionName: item.constructionName,
          area: item.area,
          fechaReporte: item.fechaReporte,
          actividadesCount: item.actividadesCount,
          fotosCount: item.fotosCount,
          contratistas: parse<string[]>(item.contratistasJson, []),
          supervision: parse<string[]>(item.supervisionJson, []),
          // El CONTENIDO, no solo el encuadre. La pantalla de detalle lo
          // pintaba vacío —"Sin actividades capturadas"— cuando en realidad
          // estaba aquí, serializado. Un reporte que aún no sale del teléfono
          // es justo cuando el usuario más necesita ver que su captura sigue
          // completa.
          actividades: parse<ActividadEnCola[]>(item.actividadesJson, []).map(
            (a) => a.texto,
          ),
          conclusion: item.conclusion,
          status: item.status,
          // Fotos declaradas que todavía no confirman subida. El reporte puede
          // estar `done` —ya llegó al servidor— y aun así no estar disponible
          // para nadie: sin sus fotos, el archivo no se puede generar.
          fotosPendientes: pendientesPorReporte.get(item._id) ?? 0,
          errorMessage: item.errorMessage,
          // Sin esto el chip no puede distinguir "va a reintentar" de "ya no
          // lo va a intentar más", y decir lo primero cuando es lo segundo
          // deja al usuario esperando algo que no va a pasar.
          intentosAgotados: item.retryCount >= item.maxRetries,
          createdAt: item.createdAt,
        }));
    },
    [allItems, allPhotos],
  );

  const getItemById = useCallback(
    (id: string) => realm.objectForPrimaryKey(PendingReporteSubmission, id),
    [realm],
  );

  const getPhotosByReporteId = useCallback(
    (reporteLocalId: string) => [
      ...allPhotos.filtered("reporteLocalId == $0", reporteLocalId),
    ],
    [allPhotos],
  );

  /**
   * Lo que queda por hacer, leído de Realm **en este instante**.
   *
   * No es lo mismo que los `useMemo` de abajo: esos se congelan en el render
   * que los produjo, y el worker los captura en su `useCallback`. Dentro de un
   * ciclo eso miente — el POST del reporte le acaba de poner `fotoRemotaId` a
   * sus fotos, y ese cambio no está en el snapshot con el que arrancó. El
   * worker tiene que preguntar de nuevo, no recordar.
   */
  const leerTrabajoPendiente = useCallback(() => {
    const reportes = [
      ...realm
        .objects(PendingReporteSubmission)
        .filtered('status == "pending"')
        .sorted("createdAt"),
    ];
    const fotos = [
      ...realm
        .objects(PendingReportePhotoSubmission)
        .filtered('status == "waiting" OR status == "uploaded"')
        .sorted("createdAt"),
    ].filter((foto) => foto.fotoRemotaId !== null);
    return { reportes, fotos };
  }, [realm]);

  /** Fotos listas para subir: el reporte ya sincronizó y tienen id de servidor. */
  const fotosListasParaSubir = useMemo(
    () =>
      [...allPhotos.filtered('status == "waiting" OR status == "uploaded"')]
        .filter((foto) => foto.fotoRemotaId !== null)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    [allPhotos],
  );

  // ── Escritura ───────────────────────────────────────────────────────────

  /**
   * Encola el reporte y sus fotos en UNA sola transacción.
   *
   * El `_id` que devuelve es el `client_id` que viajará en el body. Se acuña
   * aquí, al encolar, y no al enviar: es lo que hace que un reintento —de la
   * cola o de un doble toque del usuario— recupere el reporte existente en vez
   * de crear uno nuevo.
   */
  const addToQueue = useCallback(
    (data: ReporteEnColaInput): string => {
      const reporteLocalId = uuid.v4();

      realm.write(() => {
        realm.create(PendingReporteSubmission, {
          _id: reporteLocalId,
          constructionId: data.constructionId,
          constructionName: data.constructionName,
          area: data.area,
          fechaReporte: data.fechaReporte,
          conclusion: data.conclusion,
          actividadesJson: JSON.stringify(data.actividades),
          fotosJson: JSON.stringify(
            data.fotos.map(({ orden, pie, filename, takenAt }) => ({
              orden,
              pie,
              filename,
              taken_at: takenAt.toISOString(),
            })),
          ),
          proveedorIdsJson: JSON.stringify(data.proveedorIds),
          contratistasJson: JSON.stringify(data.contratistas),
          supervisionJson: JSON.stringify(data.supervision),
          actividadesCount: data.actividades.length,
          fotosCount: data.fotos.length,
          status: "pending" as PendingReporteStatus,
          createdAt: new Date(),
          lastAttemptAt: null,
          failedAt: null,
          retryCount: 0,
          maxRetries: 3,
          errorMessage: null,
          reporteId: null,
          syncedAt: null,
        });

        data.fotos.forEach((foto) => {
          realm.create(PendingReportePhotoSubmission, {
            _id: uuid.v4(),
            reporteLocalId,
            fotoRemotaId: null,
            constructionId: data.constructionId,
            orden: foto.orden,
            pie: foto.pie,
            localUri: foto.localUri,
            filename: foto.filename,
            fileSize: foto.fileSize,
            takenAt: foto.takenAt,
            status: "pending" as PendingReportePhotoStatus,
            createdAt: new Date(),
            lastAttemptAt: null,
            retryCount: 0,
            maxRetries: 3,
            errorMessage: null,
          });
        });
      });

      return reporteLocalId;
    },
    [realm],
  );

  /**
   * Cierra el envío del reporte en UNA transacción: liga cada foto local con su
   * id de servidor, las pasa a `waiting` y marca el reporte como `done`.
   *
   * Atómico por seguridad ante caídas: o queda todo, o no queda nada. Si esto
   * se hiciera en pasos, un cierre de la app a media operación dejaría fotos
   * huérfanas —sin reporte que las reclame— o un borrador ya enviado que la
   * cola volvería a mandar.
   *
   * **No se borra, se marca.** Un `done` con su `reporteId` es lo único que
   * traduce el id local que conoce la interfaz al id de servidor que necesita
   * el endpoint de archivo. Sin esa marca, tocar "Generar Excel" justo después
   * de guardar no tendría a qué reporte apuntar. Se purga cuando la lista de la
   * obra ya refleja el reporte — mismo ciclo `done` que las fotos.
   *
   * El emparejamiento de fotos va por `orden`, que es el dato que el POST envió
   * y el servidor devolvió; los ids locales no viajan.
   */
  const completeReporteSyncAtomic = useCallback(
    (
      reporteLocalId: string,
      reporteId: number,
      fotosRemotas: FotoReporte[],
    ): boolean => {
      const reporte = realm.objectForPrimaryKey(
        PendingReporteSubmission,
        reporteLocalId,
      );
      if (!reporte) {
        console.warn(
          "[ReporteQueue] completeReporteSyncAtomic: reporte no encontrado:",
          reporteLocalId,
        );
        return false;
      }

      try {
        realm.write(() => {
          const porOrden = new Map(fotosRemotas.map((f) => [f.orden, f.id]));
          const fotos = realm
            .objects(PendingReportePhotoSubmission)
            .filtered("reporteLocalId == $0", reporteLocalId);

          fotos.forEach((foto) => {
            const remotaId = porOrden.get(foto.orden);
            if (remotaId === undefined) {
              // El servidor no declaró esta foto. No debería pasar; si pasa,
              // dejarla en cola la haría reintentar para siempre.
              foto.status = "failed";
              foto.errorMessage = "El servidor no registró esta fotografía";
              return;
            }
            foto.fotoRemotaId = remotaId;
            foto.status = "waiting";
          });

          reporte.status = "done";
          reporte.reporteId = reporteId;
          reporte.syncedAt = new Date();
          reporte.errorMessage = null;
        });
        return true;
      } catch (error) {
        console.error("[ReporteQueue] Error en el cierre atómico:", error);
        return false;
      }
    },
    [realm],
  );

  const removeFromQueueWithPhotos = useCallback(
    (reporteLocalId: string): boolean => {
      const reporte = realm.objectForPrimaryKey(
        PendingReporteSubmission,
        reporteLocalId,
      );
      if (!reporte) return false;

      realm.write(() => {
        realm.delete(
          realm
            .objects(PendingReportePhotoSubmission)
            .filtered("reporteLocalId == $0", reporteLocalId),
        );
        realm.delete(reporte);
      });
      return true;
    },
    [realm],
  );

  // ── Transiciones de estado ──────────────────────────────────────────────

  const setStatus = useCallback(
    (id: string, cambios: Partial<PendingReporteSubmission>) => {
      const item = realm.objectForPrimaryKey(PendingReporteSubmission, id);
      if (!item) return false;
      realm.write(() => {
        Object.assign(item, cambios);
      });
      return true;
    },
    [realm],
  );

  const markAsSyncing = useCallback(
    (id: string) =>
      setStatus(id, { status: "syncing", lastAttemptAt: new Date() }),
    [setStatus],
  );

  /**
   * `agotarIntentos` marca un fallo del que no tiene sentido volver: el
   * servidor rechazó el contenido y va a rechazarlo igual la próxima vez.
   *
   * Se implementa subiendo `retryCount` hasta el tope en vez de con una
   * bandera nueva, y no es un atajo: "no quedan intentos" es literalmente lo
   * que significa. Así el resto del código —el chip, el ciclo— solo tiene que
   * mirar un número, y no hay dos fuentes de verdad que puedan contradecirse.
   */
  const markAsFailed = useCallback(
    (id: string, errorMessage: string, agotarIntentos = false) => {
      const item = realm.objectForPrimaryKey(PendingReporteSubmission, id);
      if (!item) return false;
      realm.write(() => {
        item.status = "failed";
        item.errorMessage = errorMessage;
        item.failedAt = new Date();
        item.retryCount = agotarIntentos
          ? item.maxRetries
          : item.retryCount + 1;
      });
      return true;
    },
    [realm],
  );

  /**
   * Reintento MANUAL de un reporte fallido: devuelve el presupuesto completo
   * de intentos.
   *
   * Que lo pida una persona cambia el significado del reintento — sabe algo
   * que el teléfono no, como que el servidor ya se arregló. Conservarle el
   * contador gastado lo condenaría a fallar de nuevo sin intentarlo siquiera.
   */
  const reintentarReporte = useCallback(
    (id: string) => {
      const item = realm.objectForPrimaryKey(PendingReporteSubmission, id);
      if (!item) return false;
      realm.write(() => {
        item.status = "pending";
        item.errorMessage = null;
        item.failedAt = null;
        item.retryCount = 0;
      });
      return true;
    },
    [realm],
  );

  const markAsPending = useCallback(
    (id: string) => setStatus(id, { status: "pending", errorMessage: null }),
    [setStatus],
  );

  /**
   * Devuelve a `pending` lo que quedó en `syncing` de una sesión anterior.
   *
   * Un item en `syncing` sin worker vivo detrás no lo va a mover nadie: sin
   * este rescate al arrancar, un cierre de la app a media subida deja el
   * reporte encallado para siempre.
   */
  const resetStuckSyncingItems = useCallback((): number => {
    const stuck = realm
      .objects(PendingReporteSubmission)
      .filtered('status == "syncing"');
    if (stuck.length === 0) return 0;

    const total = stuck.length;
    realm.write(() => {
      stuck.forEach((item) => {
        item.status = "pending";
      });
    });
    return total;
  }, [realm]);

  // ── Fotos ───────────────────────────────────────────────────────────────

  const setPhotoStatus = useCallback(
    (
      id: string,
      status: PendingReportePhotoStatus,
      errorMessage: string | null = null,
    ) => {
      const foto = realm.objectForPrimaryKey(
        PendingReportePhotoSubmission,
        id,
      );
      if (!foto) return false;
      realm.write(() => {
        foto.status = status;
        foto.errorMessage = errorMessage;
        foto.lastAttemptAt = new Date();
        if (status === "failed") foto.retryCount += 1;
      });
      return true;
    },
    [realm],
  );

  /**
   * Borra las fotos ya confirmadas. Se llama DESPUÉS de que la consulta del
   * reporte refleje el estado nuevo — el mismo ciclo `done` de la enmienda E5
   * de la Fase 1: sacarlas antes haría que el conteo bajara y volviera a subir
   * a la vista del usuario.
   */
  const removeDonePhotos = useCallback((): number => {
    const hechas = realm
      .objects(PendingReportePhotoSubmission)
      .filtered('status == "done"');
    if (hechas.length === 0) return 0;

    const total = hechas.length;
    realm.write(() => {
      realm.delete(hechas);
    });
    return total;
  }, [realm]);

  /**
   * Id de servidor de un reporte que se acaba de enviar, o `null` si todavía
   * no llega. Es el puente entre el id local del wizard y el endpoint de
   * archivo.
   */
  const resolverReporteId = useCallback(
    (localId: string): number | null =>
      realm.objectForPrimaryKey(PendingReporteSubmission, localId)?.reporteId ??
      null,
    [realm],
  );

  /**
   * Borra los reportes ya sincronizados. Se llama DESPUÉS de que la lista de la
   * obra los refleje: sacarlos antes los haría desaparecer de la pantalla y
   * reaparecer con el refetch.
   */
  const removeDoneReportes = useCallback((): number => {
    const hechos = realm
      .objects(PendingReporteSubmission)
      .filtered('status == "done"');
    if (hechos.length === 0) return 0;

    const total = hechos.length;
    realm.write(() => {
      realm.delete(hechos);
    });
    return total;
  }, [realm]);

  const resetStuckSyncingPhotos = useCallback((): number => {
    const stuck = realm
      .objects(PendingReportePhotoSubmission)
      .filtered('status == "syncing"');
    if (stuck.length === 0) return 0;

    const total = stuck.length;
    realm.write(() => {
      stuck.forEach((foto) => {
        // A `waiting` y no a `pending`: su reporte YA sincronizó y conserva su
        // id de servidor. Mandarla a `pending` la dejaría esperando un envío
        // que nunca va a volver a ocurrir.
        foto.status = "waiting";
      });
    });
    return total;
  }, [realm]);

  return {
    // Lectura
    pendingItems: [...pendingItems],
    failedItems: [...failedItems],
    reportesEnCola,
    pendingCount,
    failedCount,
    syncingCount,
    totalCount,
    getItemById,
    getPhotosByReporteId,
    fotosListasParaSubir,
    leerTrabajoPendiente,

    // Escritura
    addToQueue,
    completeReporteSyncAtomic,
    removeFromQueueWithPhotos,
    resolverReporteId,
    removeDoneReportes,

    // Estado
    markAsSyncing,
    markAsFailed,
    markAsPending,
    reintentarReporte,
    resetStuckSyncingItems,

    // Fotos
    setPhotoStatus,
    removeDonePhotos,
    resetStuckSyncingPhotos,
  };
}
