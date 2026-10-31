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
  const { reportesEnCola } = usePendingReporteQueue();
  const { syncNow, isReporteSyncing } = useSyncWorker();

  /**
   * **Detenido = se agotaron los intentos.** Un reporte entre reintentos está
   * `failed` por unos segundos mientras el worker espera su backoff, y
   * pintarlo de rojo ahí convierte un estado de paso en un veredicto: la
   * franja decía "1 fallido" —sin ninguna acción— sobre algo que se iba a
   * reintentar solo un segundo después.
   *
   * Es el mismo corte que ya hace el chip de la fila, que dice "Reintentando"
   * mientras queden intentos y "No se envió" cuando no.
   */
  const detenidos = useMemo(
    () =>
      reportesEnCola.filter((r) => r.status === "failed" && r.intentosAgotados)
        .length,
    [reportesEnCola],
  );

  /**
   * Lo que todavía no está disponible y **no** está detenido: no ha llegado al
   * servidor, le faltan fotos, o está esperando su reintento. Mismo criterio
   * que el chip de la lista — el usuario no tiene por qué llevar dos cuentas
   * distintas de lo mismo en la misma pantalla.
   */
  const enEspera = useMemo(
    () =>
      reportesEnCola.filter(
        (r) =>
          !(r.status === "failed" && r.intentosAgotados) &&
          !(r.status === "done" && r.fotosPendientes === 0),
      ).length,
    [reportesEnCola],
  );

  /**
   * **"Sincronizando" es que el ciclo esté corriendo, no que una fila esté en
   * `syncing`.**
   *
   * Antes salía de contar reportes con `status === "syncing"`, y ese estado
   * solo existe mientras el POST del reporte está en vuelo: un segundo. Las
   * fotos son otra cola y subirlas nunca devuelve el reporte a `syncing`, así
   * que durante TODA la subida de fotos —el tramo largo, en el que la app está
   * trabajando más— la franja decía "N pendientes de sincronizar" y ofrecía el
   * botón de Sincronizar, como si nada estuviera pasando.
   *
   * El botón solo aparece cuando no hay ciclo (lo decide `OfflineIndicator`),
   * así que con esto vuelve a significar lo que debe: hay trabajo parado y
   * nadie lo está intentando.
   */
  return (
    <OfflineIndicator
      pendingCount={enEspera}
      failedCount={detenidos}
      isSyncing={isReporteSyncing}
      onSyncPress={syncNow}
    />
  );
}
