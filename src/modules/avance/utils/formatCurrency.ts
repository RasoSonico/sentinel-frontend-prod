/**
 * Formato compacto de importes para la zona de avance (vocabulario ADR-003:
 * siempre "Importe", nunca "financiero"). Extraído de SabanaGlobalCard para
 * compartirse con HoyResumenHeader y la línea de métricas del catálogo.
 */
export function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}
