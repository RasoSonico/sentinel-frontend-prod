import { useCallback, useMemo } from "react";

import { useQuery, useRealm } from "@realm/react";
import { uuid } from "expo-modules-core";

import {
  PendingCapturaSubmission,
  type PendingCapturaStatus,
} from "src/realm/pendingJornada/PendingCapturaSubmission";

/**
 * Cola offline de capturas de la hoja de jornada (ADR-009 D1).
 *
 * Mismo contrato que las demás colas de la app —`pending → syncing → done`,
 * con `failed` y rescate manual—, con una diferencia que la vuelve distinta:
 * **el orden por máquina importa**. Un cierre no tiene sentido sin su
 * arranque. Ver `leerTrabajoPendiente`.
 */

/**
 * Una actividad tal como la captura la hoja. El `orden` es local; el servidor
 * lo continúa a partir del último renglón de la jornada.
 */
export interface DetalleParaEncolar {
  concept?: number | null;
  descripcion?: string;
  horasEstimadas?: string | null;
}

export interface CapturaParaEncolar {
  estanciaId: number;
  maquinariaId: number;
  /** `_id` del alta en cola si la máquina aún no existe en el servidor. */
  maquinariaLocalId?: string | null;
  fecha: string;
  autor: string;
  horometroInicial?: string | null;
  horometroFinal?: string | null;
  /** Resolver un cierre olvidado: `{ final }` o `{ sinFinal: true }`. */
  cerrarAnterior?: { final: string } | { sinFinal: true } | null;
  estado?: "SIN_OPERAR" | null;
  motivoInactividad?: string | null;
  observaciones?: string;
  detalles?: DetalleParaEncolar[];
  constructionId: number;
  maquinariaEtiqueta: string;
}

/**
 * La llave de "máquina" de una captura: la estancia del servidor, o el alta
 * local mientras la máquina viva solo en el teléfono.
 *
 * Todas las máquinas locales comparten `estanciaId = 0`, así que agrupar por
 * estancia a secas colapsaría las de todas en una.
 */
export const llaveMaquina = (c: {
  estanciaId: number;
  maquinariaLocalId: string | null;
}): string =>
  c.maquinariaLocalId ? `local-${c.maquinariaLocalId}` : `e-${c.estanciaId}`;

/** Una captura que ya no se reintenta sola: necesita a una persona. */
export const estaAtorada = (c: PendingCapturaSubmission): boolean =>
  c.status === "failed" && c.retryCount >= c.maxRetries;

export function usePendingCapturaQueue() {
  const realm = useRealm();
  const todas = useQuery(PendingCapturaSubmission);

  /**
   * Las capturas de cada máquina, en el orden en que se guardaron.
   *
   * Las `done` TAMBIÉN entran: entre que el POST responde y el hub refleja la
   * captura hay una ventana, y si aquí se saltaran, lo recién enviado
   * desaparecería de la hoja por un instante. Quién decide si una `done` ya
   * la trae el hub es `diaMaquina.ts`, comparando con la hora del caché.
   */
  const porMaquina = useMemo(() => {
    const mapa = new Map<string, PendingCapturaSubmission[]>();
    const ordenadas = Array.from(todas).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    for (const item of ordenadas) {
      const llave = llaveMaquina(item);
      const lista = mapa.get(llave);
      if (lista) lista.push(item);
      else mapa.set(llave, [item]);
    }
    return mapa;
  }, [todas]);

  const pendingCount = useMemo(
    () => todas.filter((c) => c.status === "pending").length,
    [todas],
  );

  const failedCount = useMemo(
    () => todas.filter((c) => c.status === "failed").length,
    [todas],
  );

  /**
   * Todo lo que aún no llegó al servidor. Lo consume el aviso de
   * `PerfilScreen` antes de cerrar sesión.
   */
  const totalCount = useMemo(
    () => todas.filter((c) => c.status !== "done").length,
    [todas],
  );

  const getItemById = useCallback(
    (id: string) => realm.objectForPrimaryKey(PendingCapturaSubmission, id),
    [realm],
  );

  /**
   * Lo que el worker puede mandar AHORA, leído fresco de Realm.
   *
   * Por máquina y en orden de captura, y **se detiene en la primera que no
   * está lista**: una fallida, una que se está enviando, o una que todavía
   * espera a su alta. Mandar las siguientes produciría errores en cascada —un
   * cierre que responde "No hay arranque que cerrar"— y gastaría intentos
   * contra un problema de orden, no de datos (decisión del 31-oct).
   *
   * Las demás máquinas no esperan: un fallo en la retro no detiene a la
   * excavadora.
   */
  const leerTrabajoPendiente = useCallback((): PendingCapturaSubmission[] => {
    const vivas = realm
      .objects(PendingCapturaSubmission)
      .filtered('status != "done"')
      .sorted("createdAt");
    const bloqueadas = new Set<string>();
    const listas: PendingCapturaSubmission[] = [];
    for (const item of vivas) {
      const llave = llaveMaquina(item);
      if (bloqueadas.has(llave)) continue;
      if (item.status !== "pending" || item.maquinariaLocalId !== null) {
        bloqueadas.add(llave);
        continue;
      }
      listas.push(item);
    }
    return listas;
  }, [realm]);

  const addToQueue = useCallback(
    (datos: CapturaParaEncolar): string => {
      // El `client_id` se acuña AQUÍ, al encolar: es lo que vuelve seguro el
      // reintento. Y la hora, también aquí: vale la hora en que se registra.
      const id = uuid.v4();
      const cerrar = datos.cerrarAnterior ?? null;
      realm.write(() => {
        realm.create(PendingCapturaSubmission, {
          _id: id,
          estanciaId: datos.estanciaId,
          maquinariaId: datos.maquinariaId,
          maquinariaLocalId: datos.maquinariaLocalId ?? null,
          fecha: datos.fecha,
          registradoEn: new Date().toISOString(),
          autor: datos.autor,
          horometroInicial: datos.horometroInicial || null,
          horometroFinal: datos.horometroFinal || null,
          cerrarAnteriorFinal: cerrar && "final" in cerrar ? cerrar.final : null,
          cerrarAnteriorSinFinal: !!cerrar && "sinFinal" in cerrar,
          estado: datos.estado ?? null,
          motivoInactividad: datos.motivoInactividad ?? null,
          observaciones: datos.observaciones ?? "",
          detalles: (datos.detalles ?? []).map((d, i) => ({
            orden: i + 1,
            concept: d.concept ?? null,
            descripcion: d.descripcion?.trim() ?? "",
            horas_estimadas: d.horasEstimadas || null,
            registrado_en: null,
            autor: null,
          })),
          constructionId: datos.constructionId,
          maquinariaEtiqueta: datos.maquinariaEtiqueta,
          status: "pending" as PendingCapturaStatus,
          createdAt: new Date(),
          lastAttemptAt: null,
          failedAt: null,
          retryCount: 0,
          maxRetries: 3,
          errorMessage: null,
          errorMotivo: null,
          jornadaFecha: null,
          syncedAt: null,
        });
      });
      return id;
    },
    [realm],
  );

  const setStatus = useCallback(
    (id: string, cambios: Partial<PendingCapturaSubmission>) => {
      const item = realm.objectForPrimaryKey(PendingCapturaSubmission, id);
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
   * `agotarIntentos` marca un fallo del que no tiene sentido volver: sube
   * `retryCount` al tope en vez de agregar una bandera, porque "no quedan
   * intentos" es literalmente lo que significa.
   */
  const markAsFailed = useCallback(
    (
      id: string,
      errorMessage: string,
      agotarIntentos = false,
      errorMotivo: string | null = null,
    ) => {
      const item = realm.objectForPrimaryKey(PendingCapturaSubmission, id);
      if (!item) return false;
      realm.write(() => {
        item.status = "failed";
        item.errorMessage = errorMessage;
        item.errorMotivo = errorMotivo;
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
    (id: string, jornadaFecha: string) =>
      setStatus(id, {
        status: "done",
        jornadaFecha,
        syncedAt: new Date(),
        errorMessage: null,
        errorMotivo: null,
      }),
    [setStatus],
  );

  /**
   * Reintento MANUAL: devuelve el presupuesto completo de intentos. Que lo
   * pida una persona cambia el significado — sabe algo que el teléfono no.
   */
  const reintentarCaptura = useCallback(
    (id: string) => {
      const item = realm.objectForPrimaryKey(PendingCapturaSubmission, id);
      if (!item) return false;
      realm.write(() => {
        item.status = "pending";
        item.errorMessage = null;
        item.errorMotivo = null;
        item.failedAt = null;
        item.retryCount = 0;
      });
      return true;
    },
    [realm],
  );

  /** Al descartarla, las capturas que esperaban detrás vuelven a fluir. */
  const descartarCaptura = useCallback(
    (id: string) => {
      const item = realm.objectForPrimaryKey(PendingCapturaSubmission, id);
      if (!item) return false;
      realm.write(() => realm.delete(item));
      return true;
    },
    [realm],
  );

  /**
   * Devuelve a `pending` lo que quedó en `syncing` de una sesión anterior:
   * sin worker vivo detrás, nadie lo movería.
   */
  const resetStuckSyncingItems = useCallback((): number => {
    const encalladas = realm
      .objects(PendingCapturaSubmission)
      .filtered('status == "syncing"');
    if (!encalladas.length) return 0;
    const total = encalladas.length;
    realm.write(() => {
      for (const item of encalladas) item.status = "pending";
    });
    return total;
  }, [realm]);

  /**
   * Purga las confirmadas que el hub YA trae: las que se confirmaron antes
   * de la última escritura del caché. Borrarlas antes dejaría un hueco en la
   * hoja hasta el siguiente refetch.
   */
  const removeDoneCapturas = useCallback(
    (hubEscritoEn: Date | null): number => {
      if (!hubEscritoEn) return 0;
      const listas = realm
        .objects(PendingCapturaSubmission)
        .filtered('status == "done" AND syncedAt < $0', hubEscritoEn);
      if (!listas.length) return 0;
      const total = listas.length;
      realm.write(() => realm.delete(listas));
      return total;
    },
    [realm],
  );

  return {
    todas,
    porMaquina,
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
    reintentarCaptura,
    descartarCaptura,
    resetStuckSyncingItems,
    removeDoneCapturas,
  };
}
