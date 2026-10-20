import React, { useMemo } from "react";

import OfflineIndicator from "src/components/common/OfflineIndicator";
import { usePendingReporteQueue } from "src/hooks/reportes/usePendingReporteQueue";
import { useSyncWorker } from "src/providers/SyncWorkerProvider";

/**
 * Cableado del `OfflineIndicator` para Reportes.
 *
 * Mismo componente que usan Avances y el formulario de captura: la franja de
 * "Modo sin conexión" es una convención de toda la app, y reproducirla con otro
 * aspecto en Reportes enseñaría al usuario que cada pantalla dice las cosas a
 * su manera.
 *
 * **El `syncNow` sale del contexto de `SyncWorkerProvider`, no de montar el
 * worker aquí.** `useReporteSyncWorker` en una pantalla crearía un SEGUNDO
 * worker sobre la misma cola, con dos ciclos pisándose. El contexto expone el
 * del provider, que además arrastra los tres workers de una vez.
 */
export function IndicadorSincronizacion() {
  const { reportesEnCola, failedCount, syncingCount } =
    usePendingReporteQueue();
  const { syncNow } = useSyncWorker();

  /**
   * Cuenta reportes que todavía NO están disponibles, por cualquier motivo:
   * o no han llegado al servidor, o sus fotos siguen subiendo. Es el mismo
   * criterio del chip de la lista — el usuario no tiene por qué llevar dos
   * cuentas distintas de lo mismo en la misma pantalla.
   *
   * Los fallidos van aparte porque el indicador los pinta distinto: no están
   * esperando, están detenidos.
   */
  const pendientes = useMemo(
    () =>
      reportesEnCola.filter(
        (r) =>
          r.status !== "failed" &&
          !(r.status === "done" && r.fotosPendientes === 0),
      ).length,
    [reportesEnCola],
  );

  return (
    <OfflineIndicator
      pendingCount={pendientes}
      failedCount={failedCount}
      isSyncing={syncingCount > 0}
      onSyncPress={syncNow}
    />
  );
}
