import { useCallback, useMemo } from "react";

import { useQuery, useRealm } from "@realm/react";
import { uuid } from "expo-modules-core";

import {
  PendingJornadaSubmission,
  type PendingJornadaStatus,
} from "src/realm/pendingJornada/PendingJornadaSubmission";

/**
 * Cola offline de la jornada de maquinaria.
 *
 * Mismo contrato que `usePendingReporteQueue`, recortado: una jornada es un
 * solo POST, así que no hay segunda fase ni enlaces que reescribir.
 */

/**
 * Una actividad tal como la captura la hoja.
 *
 * El `orden` no viaja: lo da la posición en el arreglo, igual que en el POST.
 * Un solo criterio de numeración de punta a punta.
 */
export interface DetalleParaEncolar {
  concept?: number | null;
  descripcion?: string;
  horasEstimadas?: string | null;
}

export interface JornadaParaEncolar {
  estanciaId: number;
  maquinariaId: number;
  /** `_id` del alta en cola si la máquina aún no existe en el servidor. */
  maquinariaLocalId?: string | null;
  fecha: string;
  estado: "TRABAJANDO" | "SIN_OPERAR";
  /** Al menos una cuando TRABAJANDO; vacío cuando SIN_OPERAR. */
  detalles?: DetalleParaEncolar[];
  motivoInactividad?: string | null;
  observaciones?: string;
  horometroInicial?: string | null;
  horometroFinal?: string | null;
  constructionId: number;
  maquinariaEtiqueta: string;
}

export function usePendingJornadaQueue() {
  const realm = useRealm();
  const todas = useQuery(PendingJornadaSubmission);

  /**
   * Lo que todavía no llegó al servidor, por máquina.
   *
   * El hub lo usa para que la tarjeta diga "reportada" en cuanto se captura,
   * sin esperar al refetch. Es un mapa y no un `find` dentro del render: con
   * veinte máquinas en obra, buscar por cada tarjeta sería cuadrático.
   */
  const porEstancia = useMemo(() => {
    const mapa = new Map<number, PendingJornadaSubmission>();
    for (const item of todas) {
      // Las `done` TAMBIÉN entran, y eso es el punto.
      //
      // Entre que el POST responde y el hub refleja la jornada hay una ventana
      // en la que el servidor todavía no la trae. Si aquí se saltaran las
      // `done`, la tarjeta perdería su estado en ese hueco y volvería a decir
      // "Sin reportar hoy" sobre algo que acaba de enviarse — invitando a
      // capturarla de nuevo. Se quedan hasta que `removeDoneJornadas` las
      // purgue, que corre DESPUÉS del refetch.
      //
      // Es el mismo ciclo `done` que el reporte: se marca, no se borra.
      mapa.set(item.estanciaId, item);
    }
    return mapa;
  }, [todas]);

  /**
   * Las jornadas de máquinas que todavía no existen en el servidor, por el
   * `_id` de su alta.
   *
   * Hace falta un mapa aparte porque **todas las máquinas locales comparten
   * `estanciaId = 0`** —no tienen estancia todavía—, así que buscarlas en
   * `porEstancia` las colapsaría en una sola: la jornada de una aparecería en
   * la tarjeta de todas.
   */
  const porMaquinariaLocal = useMemo(() => {
    const mapa = new Map<string, PendingJornadaSubmission>();
    for (const item of todas) {
      if (!item.maquinariaLocalId) continue;
      mapa.set(item.maquinariaLocalId, item);
    }
    return mapa;
  }, [todas]);

  const pendingCount = useMemo(
    () => todas.filter((j) => j.status === "pending").length,
    [todas],
  );

  const failedCount = useMemo(
    () => todas.filter((j) => j.status === "failed").length,
    [todas],
  );

  /**
   * Todo lo que aún no llegó al servidor, sea cual sea su estado.
   *
   * Lo consume el aviso de `PerfilScreen` antes de cerrar sesión: el logout no
   * borra la cola, pero si otra persona entra en este dispositivo se pierde.
   */
  const totalCount = useMemo(
    () => todas.filter((j) => j.status !== "done").length,
    [todas],
  );

  const getItemById = useCallback(
    (id: string) => realm.objectForPrimaryKey(PendingJornadaSubmission, id),
    [realm],
  );

  /**
   * Lectura FRESCA de Realm, no el snapshot que capturó el render.
   *
   * El worker la usa dentro de su lazo. Iterar el snapshot fue el bug que
   * dejaba las fotos del reporte esperando un ciclo que nunca llegaba: lo que
   * el POST acababa de cambiar no estaba en la copia vieja.
   */
  const leerTrabajoPendiente = useCallback(
    () =>
      realm
        .objects(PendingJornadaSubmission)
        // `maquinariaLocalId == null` excluye las que esperan a un alta: sin
        // `estanciaId` real no hay a qué colgarlas, y mandarlas produciría un
        // 400 que gastaría intentos contra un problema de orden, no de datos.
        // El worker envía el alta primero y limpia el enlace; recién entonces
        // entran aquí.
        .filtered('status == "pending" AND maquinariaLocalId == null')
        .sorted("createdAt"),
    [realm],
  );

  const addToQueue = useCallback(
    (datos: JornadaParaEncolar): string => {
      // El `client_id` se acuña AQUÍ, al encolar. Es lo que vuelve seguro el
      // reintento: el servidor devuelve la jornada ya creada en vez de chocar
      // contra `unique(estancia, fecha)` y confundir al usuario.
      const id = uuid.v4();
      realm.write(() => {
        realm.create(PendingJornadaSubmission, {
          _id: id,
          estanciaId: datos.estanciaId,
          maquinariaId: datos.maquinariaId,
          maquinariaLocalId: datos.maquinariaLocalId ?? null,
          fecha: datos.fecha,
          estado: datos.estado,
          // El `orden` se asigna por POSICIÓN, aquí y en el POST. Guardarlo
          // sirve para que, si el usuario abre lo que está en cola, vea sus
          // actividades como las capturó.
          detalles: (datos.detalles ?? []).map((d, i) => ({
            orden: i + 1,
            concept: d.concept ?? null,
            descripcion: d.descripcion?.trim() ?? "",
            horas_estimadas: d.horasEstimadas || null,
          })),
          motivoInactividad: datos.motivoInactividad ?? null,
          observaciones: datos.observaciones ?? "",
          horometroInicial: datos.horometroInicial || null,
          horometroFinal: datos.horometroFinal || null,
          constructionId: datos.constructionId,
          maquinariaEtiqueta: datos.maquinariaEtiqueta,
          status: "pending" as PendingJornadaStatus,
          createdAt: new Date(),
          lastAttemptAt: null,
          failedAt: null,
          retryCount: 0,
          maxRetries: 3,
          errorMessage: null,
          jornadaId: null,
          syncedAt: null,
        });
      });
      return id;
    },
    [realm],
  );

  const setStatus = useCallback(
    (id: string, cambios: Partial<PendingJornadaSubmission>) => {
      const item = realm.objectForPrimaryKey(PendingJornadaSubmission, id);
      if (!item) return false;
      realm.write(() => Object.assign(item, cambios));
      return true;
    },
    [realm],
  );

  const markAsSyncing = useCallback(
    (id: string) =>
      setStatus(id, { status: "syncing", lastAttemptAt: new Date() }),
    [setStatus],
  );

  const markAsPending = useCallback(
    (id: string) => setStatus(id, { status: "pending", errorMessage: null }),
    [setStatus],
  );

  /**
   * `agotarIntentos` marca un fallo del que no tiene sentido volver.
   *
   * Sube `retryCount` al tope en vez de agregar una bandera: "no quedan
   * intentos" es literalmente lo que significa, y así no hay dos fuentes de
   * verdad que puedan contradecirse.
   */
  const markAsFailed = useCallback(
    (id: string, errorMessage: string, agotarIntentos = false) => {
      const item = realm.objectForPrimaryKey(PendingJornadaSubmission, id);
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

  const markAsDone = useCallback(
    (id: string, jornadaId: number) =>
      setStatus(id, {
        status: "done",
        jornadaId,
        syncedAt: new Date(),
        errorMessage: null,
      }),
    [setStatus],
  );

  /**
   * Reintento MANUAL: devuelve el presupuesto completo de intentos.
   *
   * Que lo pida una persona cambia el significado — sabe algo que el teléfono
   * no, como que el servidor ya se arregló.
   */
  const reintentarJornada = useCallback(
    (id: string) => {
      const item = realm.objectForPrimaryKey(PendingJornadaSubmission, id);
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

  const descartarJornada = useCallback(
    (id: string) => {
      const item = realm.objectForPrimaryKey(PendingJornadaSubmission, id);
      if (!item) return false;
      realm.write(() => realm.delete(item));
      return true;
    },
    [realm],
  );

  /**
   * Devuelve a `pending` lo que quedó en `syncing` de una sesión anterior.
   *
   * Un item en `syncing` sin worker vivo detrás no lo mueve nadie: sin este
   * rescate al arrancar, cerrar la app a media subida lo encalla para siempre.
   */
  const resetStuckSyncingItems = useCallback((): number => {
    const encalladas = realm
      .objects(PendingJornadaSubmission)
      .filtered('status == "syncing"');
    if (!encalladas.length) return 0;
    const total = encalladas.length;
    realm.write(() => {
      for (const item of encalladas) item.status = "pending";
    });
    return total;
  }, [realm]);

  /**
   * Purga las ya confirmadas.
   *
   * Se borran DESPUÉS de que el hub las refleje, no al recibir el 201: si
   * desaparecieran al sincronizar, la tarjeta volvería a "sin reportar" por un
   * instante hasta que llegara el refetch.
   */
  const removeDoneJornadas = useCallback((): number => {
    const listas = realm
      .objects(PendingJornadaSubmission)
      .filtered('status == "done"');
    if (!listas.length) return 0;
    const total = listas.length;
    realm.write(() => realm.delete(listas));
    return total;
  }, [realm]);

  return {
    todas,
    porEstancia,
    porMaquinariaLocal,
    pendingCount,
    failedCount,
    totalCount,
    getItemById,
    leerTrabajoPendiente,
    addToQueue,
    markAsSyncing,
    markAsPending,
    markAsFailed,
    markAsDone,
    reintentarJornada,
    descartarJornada,
    resetStuckSyncingItems,
    removeDoneJornadas,
  };
}
