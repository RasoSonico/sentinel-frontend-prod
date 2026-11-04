import { useCallback, useMemo } from "react";

import { useQuery, useRealm } from "@realm/react";
import { uuid } from "expo-modules-core";

import {
  PendingMaquinariaSubmission,
  type PendingMaquinariaStatus,
} from "src/realm/pendingMaquinaria/PendingMaquinariaSubmission";
import { PendingCapturaSubmission } from "src/realm/pendingJornada/PendingCapturaSubmission";

export interface MaquinariaParaEncolar {
  constructionId: number;
  tipoId: number;
  tipoNombre: string;
  marca: string;
  modelo: string;
  propietarioTipo: string;
  tipoPermanencia: string;
  fechaIngreso: string;
}

export function usePendingMaquinariaQueue() {
  const realm = useRealm();
  const todas = useQuery(PendingMaquinariaSubmission);

  /**
   * Las altas que la lista del hub PUEDE necesitar pintar. Incluidas las
   * `done`, y eso es el punto.
   *
   * Antes esto filtraba `status !== "done"` y producía un parpadeo: en cuanto
   * el POST respondía, la máquina salía de aquí; el refetch del hub tardaba un
   * poco más en aterrizar, y en esa ventana la máquina **no estaba en ninguna
   * de las dos listas**. El supervisor veía desaparecer una máquina que acababa
   * de registrar y reaparecer un segundo después.
   *
   * Es el mismo hueco que hacía que una tarjeta volviera a "Sin reportar hoy",
   * y se tapa igual: lo enviado se sigue pintando hasta que el servidor lo
   * confirme de verdad.
   *
   * **Quién sobra no se decide aquí.** Este hook no sabe qué máquinas trae el
   * hub; sólo la pantalla tiene las dos mitades. Ver `HubDiarioScreen`.
   */
  const altasParaLaLista = todas;

  const pendingCount = useMemo(
    () => todas.filter((m) => m.status === "pending").length,
    [todas],
  );

  const totalCount = useMemo(
    () => todas.filter((m) => m.status !== "done").length,
    [todas],
  );

  const getItemById = useCallback(
    (id: string) =>
      realm.objectForPrimaryKey(PendingMaquinariaSubmission, id),
    [realm],
  );

  const leerTrabajoPendiente = useCallback(
    () =>
      realm
        .objects(PendingMaquinariaSubmission)
        .filtered('status == "pending"')
        .sorted("createdAt"),
    [realm],
  );

  const addToQueue = useCallback(
    (datos: MaquinariaParaEncolar): string => {
      const id = uuid.v4();
      realm.write(() => {
        realm.create(PendingMaquinariaSubmission, {
          _id: id,
          constructionId: datos.constructionId,
          tipoId: datos.tipoId,
          tipoNombre: datos.tipoNombre,
          marca: datos.marca,
          modelo: datos.modelo,
          propietarioTipo: datos.propietarioTipo,
          tipoPermanencia: datos.tipoPermanencia,
          fechaIngreso: datos.fechaIngreso,
          status: "pending" as PendingMaquinariaStatus,
          createdAt: new Date(),
          lastAttemptAt: null,
          failedAt: null,
          retryCount: 0,
          maxRetries: 3,
          errorMessage: null,
          maquinariaId: null,
          estanciaId: null,
          syncedAt: null,
        });
      });
      return id;
    },
    [realm],
  );

  const setStatus = useCallback(
    (id: string, cambios: Partial<PendingMaquinariaSubmission>) => {
      const item = realm.objectForPrimaryKey(PendingMaquinariaSubmission, id);
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
   * **"No ahora" no es "falló".**
   *
   * Un corte de red, un 5xx o un plazo vencido no dicen nada sobre el
   * contenido: el servidor ni siquiera llegó a opinar. Pasarlos por `failed`
   * —como se hacía— los contaba contra un presupuesto de tres intentos y, al
   * agotarlo, detenía la máquina para siempre. En una obra con señal que va y
   * viene, tres transiciones de zona en una mañana bastaban.
   *
   * Vuelve a `pending` sin tocar ese presupuesto. `retryCount` sube solo como
   * contador de diagnóstico: quien decide si algo está detenido mira el
   * estado, no el número.
   */
  const aplazarAlta = useCallback(
    (id: string, errorMessage: string) => {
      const item = realm.objectForPrimaryKey(PendingMaquinariaSubmission, id);
      if (!item) return false;
      realm.write(() => {
        item.status = "pending";
        item.errorMessage = errorMessage;
        item.retryCount += 1;
      });
      return true;
    },
    [realm],
  );

  const markAsFailed = useCallback(
    (id: string, errorMessage: string, agotarIntentos = false) => {
      const item = realm.objectForPrimaryKey(PendingMaquinariaSubmission, id);
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
   * Cierra el alta **y reescribe las capturas que la esperaban**, en UNA sola
   * transacción de Realm.
   *
   * Que sea atómico no es estética: si el alta quedara marcada como `done` y
   * la reescritura fallara a medias, las jornadas se quedarían apuntando a un
   * alta ya consumida y no habría quién les diera su `estanciaId` — colgadas
   * para siempre, sin error visible.
   *
   * Es el mismo cierre atómico que `completeReporteSyncAtomic` hace con las
   * fotos; lo que cambia es que aquí el enlace cruza de una cola a otra.
   */
  const completarAltaYEnlazar = useCallback(
    (id: string, maquinariaId: number, estanciaId: number): number => {
      const item = realm.objectForPrimaryKey(PendingMaquinariaSubmission, id);
      if (!item) return 0;

      const esperando = realm
        .objects(PendingCapturaSubmission)
        .filtered("maquinariaLocalId == $0", id);

      let enlazadas = 0;
      realm.write(() => {
        item.status = "done";
        item.maquinariaId = maquinariaId;
        item.estanciaId = estanciaId;
        item.syncedAt = new Date();
        item.errorMessage = null;

        for (const captura of esperando) {
          captura.estanciaId = estanciaId;
          captura.maquinariaId = maquinariaId;
          // Limpiar el enlace es lo que la habilita para enviarse: mientras
          // no sea null, el worker la salta.
          captura.maquinariaLocalId = null;
          enlazadas += 1;
        }
      });
      return enlazadas;
    },
    [realm],
  );

  const reintentarAlta = useCallback(
    (id: string) => {
      const item = realm.objectForPrimaryKey(PendingMaquinariaSubmission, id);
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

  /**
   * Descartar un alta se lleva sus capturas.
   *
   * Dejarlas sería peor que borrarlas: quedarían esperando un alta que ya no
   * existe, invisibles y sin manera de resolverse. Quien descarta el alta está
   * diciendo que esa máquina no va.
   */
  const descartarAlta = useCallback(
    (id: string): number => {
      const item = realm.objectForPrimaryKey(PendingMaquinariaSubmission, id);
      if (!item) return 0;
      const huerfanas = realm
        .objects(PendingCapturaSubmission)
        .filtered("maquinariaLocalId == $0", id);
      const total = huerfanas.length;
      realm.write(() => {
        realm.delete(huerfanas);
        realm.delete(item);
      });
      return total;
    },
    [realm],
  );

  const resetStuckSyncingItems = useCallback((): number => {
    const encalladas = realm
      .objects(PendingMaquinariaSubmission)
      .filtered('status == "syncing"');
    if (!encalladas.length) return 0;
    const total = encalladas.length;
    realm.write(() => {
      for (const item of encalladas) item.status = "pending";
    });
    return total;
  }, [realm]);

  const removeDoneMaquinarias = useCallback((): number => {
    const listas = realm
      .objects(PendingMaquinariaSubmission)
      .filtered('status == "done"');
    if (!listas.length) return 0;
    const total = listas.length;
    realm.write(() => realm.delete(listas));
    return total;
  }, [realm]);

  return {
    todas,
    altasParaLaLista,
    pendingCount,
    totalCount,
    getItemById,
    leerTrabajoPendiente,
    addToQueue,
    markAsSyncing,
    markAsPending,
    aplazarAlta,
    markAsFailed,
    completarAltaYEnlazar,
    reintentarAlta,
    descartarAlta,
    resetStuckSyncingItems,
    removeDoneMaquinarias,
  };
}
