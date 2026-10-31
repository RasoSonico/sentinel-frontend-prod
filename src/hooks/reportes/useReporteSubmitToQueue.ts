import { useCallback } from "react";

import { telemetry } from "src/services/telemetry";
import type { BorradorReporte } from "src/modules/reportes/state/BorradorReporteContext";

import { useNetworkStatus } from "../utils/useNetworkStatus";
import { usePendingReporteQueue } from "./usePendingReporteQueue";

/**
 * Encola el borrador terminado (ADR-006, Decisión 7).
 *
 * **Único camino de salida del wizard.** Ninguna pantalla llama al servicio de
 * red directamente: toda escritura pasa por la cola, misma regla que D13.1 del
 * ADR-004 fijó para la captura rápida. Duplicar el pipeline rompería la
 * atomicidad del cierre y el conteo de pendientes.
 *
 * El `orden` se asigna AQUÍ, a partir de la posición en el borrador. Es el
 * único momento en que la posición se congela en un dato: hasta aquí el numeral
 * era presentación, y desde aquí es lo que el documento imprimirá.
 */

export interface ResultadoEncolado {
  reporteLocalId: string;
  /**
   * Con red el worker arranca en menos de un segundo y el usuario verá su
   * reporte en la lista de la obra; sin red se queda como "Por enviar".
   *
   * La bifurcación es información, no decoración: el usuario necesita saber si
   * su reporte ya está donde los demás lo verán o si sigue esperando señal.
   * Ocultarlo produciría la peor falla posible — creer que se entregó algo que
   * sigue en el teléfono.
   */
  enviado: boolean;
}

interface Contexto {
  constructionId: number;
  constructionName: string;
}

export function useReporteSubmitToQueue() {
  const { addToQueue } = usePendingReporteQueue();
  const isOnline = useNetworkStatus();

  const submitToQueue = useCallback(
    (borrador: BorradorReporte, contexto: Contexto): ResultadoEncolado => {
      const reporteLocalId = addToQueue({
        constructionId: contexto.constructionId,
        constructionName: contexto.constructionName,
        // El wizard no deja llegar aquí sin área: P-00 bloquea el botón. El
        // `?? ""` es solo para satisfacer al tipo — un área vacía la rechaza el
        // servidor con 400 en `area`.
        area: borrador.area ?? "",
        fechaReporte: borrador.fechaReporte,
        conclusion: borrador.conclusion.trim(),
        actividades: borrador.actividades.map((actividad, indice) => ({
          orden: indice + 1,
          texto: actividad.texto,
        })),
        fotos: borrador.fotos.map((foto, indice) => ({
          orden: indice + 1,
          pie: foto.pie.trim(),
          filename: foto.filename,
          localUri: foto.localUri,
          fileSize: foto.fileSize,
          takenAt: foto.takenAt,
        })),
        proveedorIds: borrador.proveedorIds,
        // El wizard no deja llegar aquí sin firma: la Revisión bloquea el
        // botón. El `??` satisface al tipo — una firma faltante la rechaza el
        // servidor con 400 en `firma`, igual que un área vacía.
        firma: borrador.firma ?? { ancho: 0, alto: 0, trazos: [] },
        contratistas: borrador.contratistas.map((p) => p.nombre),
        supervision: borrador.supervisores.map((p) => p.nombre),
      });

      telemetry.trackEvent("reporte_actividades_queued", {
        obra_id: contexto.constructionId,
        area: borrador.area ?? "sin_area",
        actividades_count: borrador.actividades.length,
        fotos_count: borrador.fotos.length,
        contratistas_count: borrador.contratistas.length,
        supervision_count: borrador.supervisores.length,
        // Mismo criterio que `enviado`: solo un `false` explícito cuenta como
        // offline. Antes `null` subía como offline y abultaba la métrica con
        // guardados que sí tenían red.
        was_offline: isOnline === false,
      });

      // `isOnline === false` es lo ÚNICO que significa "sin señal". `null` es
      // "todavía no se sabe" (F25), y mandarlo por el camino de sin señal hacía
      // que la app contradijera a su propio chip: la lista calcula `sinSenal`
      // con esta misma comparación, así que el aviso decía "se queda en el
      // teléfono" sobre una fila que ya decía "Enviando". Si luego resulta que
      // no había red, el chip pasa a "Por enviar" y eso basta.
      return { reporteLocalId, enviado: isOnline !== false };
    },
    [addToQueue, isOnline],
  );

  return { submitToQueue, isOnline };
}
