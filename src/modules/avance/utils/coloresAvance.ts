import { DesignTokens } from "src/styles/designTokens";

/**
 * Color de las barras y los porcentajes de avance, en un solo lugar.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ SE RETIRÓ EL SEMÁFORO
 * ─────────────────────────────────────────────────────────────────────────────
 * Hasta la Fase 2 estas funciones pintaban el avance contra CONTRATO con una
 * escala de salud: <30% rojo, <60% ámbar, ≥60% verde. Vivían duplicadas en
 * `SabanaTreeItem` y en `SabanaSearchResult` —dos copias que podían divergir
 * sin que nadie se enterara— y el criterio tenía un problema de fondo:
 *
 *   **Un porcentaje contra contrato no dice si vas bien.** Eso solo lo sabe el
 *   programa. Un concepto al 20% en el mes 2 de una obra de 12 puede ir
 *   adelantado; el semáforo lo pintaba rojo igual.
 *
 * Con el programa encendido eso dejó de ser una imprecisión y pasó a ser una
 * contradicción visible: la misma fila mostraba **barra roja y chip azul
 * "Adelantado"**. Dos elementos a diez píxeles diciendo lo contrario.
 *
 * La regla nueva colorea únicamente hechos que son ciertos SIN referencia
 * temporal. El estado contra el programa vive solo en el chip; la magnitud,
 * en la longitud de la barra.
 *
 *   0%        gris claro   nada capturado
 *   0–100%    slate        magnitud, sin juicio
 *   >100%     ámbar        sobre-ejecución contra contrato (E2 / D13.3)
 *
 * El relleno es slate y no el azul de marca a propósito: `primary[500]` es
 * vecino del `#3498db` con que el chip dice "Adelantado", y volveríamos a
 * mezclar planos. El teal tampoco: está reservado al programa (D8).
 */

/** Umbral de sobre-ejecución contra lo contratado. */
export const PCT_SOBRE_EJECUTADO = 100;

export function estaSobreEjecutado(pct: number): boolean {
  return pct > PCT_SOBRE_EJECUTADO;
}

/** Relleno de la barra de avance. */
export function colorBarra(pct: number): string {
  if (pct === 0) return DesignTokens.colors.neutral[300];
  if (estaSobreEjecutado(pct)) return DesignTokens.colors.warning[500];
  return DesignTokens.colors.executive.light;
}

/** Color del número de porcentaje. */
export function colorPorcentaje(pct: number): string {
  if (pct === 0) return DesignTokens.colors.neutral[400];
  if (estaSobreEjecutado(pct)) return DesignTokens.colors.warning[700];
  return DesignTokens.colors.neutral[800];
}
