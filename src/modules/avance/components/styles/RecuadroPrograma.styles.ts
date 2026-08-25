import { Dimensions, StyleSheet } from "react-native";
import { DesignTokens } from "src/styles/designTokens";

const { width: screenWidth } = Dimensions.get("window");
const isTablet = screenWidth >= 768;
const isSmallPhone = screenWidth < 375;

const sp = (base: number) => {
  if (isTablet) return base * 1.5;
  if (isSmallPhone) return base * 0.8;
  return base;
};

/**
 * Recuadro de tres capas de la ficha del concepto (UX-SPEC-01 L-02 Rev G).
 *
 * Cada estado tiene familia de color propia y las tres tintas de una familia
 * —etiqueta, titular, detalle— van de más clara a más oscura para que la
 * jerarquía se lea aun sin distinguir el matiz. ATRASADO usa la escala roja tal
 * como la fija el spec; AL_DIA usa TEAL, que es el color del plano contractual
 * en todo el sistema (D8), no un verde de "éxito" cualquiera.
 *
 * El ÁMBAR está reservado a la alerta de rendimiento requerido, igual que en la
 * captura rápida está reservado a la sobre-ejecución: una sola cosa por color.
 */
export default StyleSheet.create({
  // ── (a) Estado de hoy ──────────────────────────────────────────────────────
  hoy: {
    borderRadius: 10,
    borderLeftWidth: 3,
    paddingVertical: sp(10),
    paddingHorizontal: sp(12),
    marginBottom: sp(10),
  },
  hoyEtiqueta: {
    fontSize: 10,
    letterSpacing: 0.6,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  hoyTitular: {
    fontSize: 17,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    marginTop: 2,
  },
  hoyDetalle: {
    fontSize: 11.5,
    marginTop: 1,
  },

  cajaAtrasado: {
    backgroundColor: "#FEF2F2",
    borderLeftColor: "#DC2626",
  },
  etiquetaAtrasado: { color: "#B91C1C" },
  titularAtrasado: { color: "#991B1B" },
  detalleAtrasado: { color: "#7F1D1D" },

  // Verde, no azul: al retirar el semáforo de las barras se liberó la escala
  // rojo/ámbar/verde para el estado, que es donde sí significa algo.
  cajaAdelantado: {
    backgroundColor: "#ECFDF5",
    borderLeftColor: "#059669",
  },
  etiquetaAdelantado: { color: "#047857" },
  titularAdelantado: { color: "#065F46" },
  detalleAdelantado: { color: "#064E3B" },

  // Sobre-ejecución: mismo ámbar que el chip y que el aviso de la fila.
  cajaSobre: {
    backgroundColor: "#FFFBEB",
    borderLeftColor: "#D97706",
  },
  etiquetaSobre: { color: "#B45309" },
  titularSobre: { color: "#92400E" },
  detalleSobre: { color: "#A16207" },

  cajaAlDia: {
    backgroundColor: "#F0FDFA",
    borderLeftColor: "#0F766E",
  },
  etiquetaAlDia: { color: "#0F766E" },
  titularAlDia: { color: "#115E59" },
  detalleAlDia: { color: "#134E4A" },

  cajaNoIniciado: {
    backgroundColor: DesignTokens.colors.background.secondary,
    borderLeftColor: DesignTokens.colors.neutral[400],
  },
  etiquetaNoIniciado: { color: DesignTokens.colors.neutral[500] },
  titularNoIniciado: { color: DesignTokens.colors.neutral[700] },
  detalleNoIniciado: { color: DesignTokens.colors.neutral[500] },

  // ── Programa vencido ───────────────────────────────────────────────────────
  vencido: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    padding: sp(10),
    marginBottom: sp(10),
  },
  vencidoIcono: {
    color: "#B45309",
    marginRight: sp(8),
    marginTop: 1,
  },
  vencidoCuerpo: {
    flex: 1,
  },
  vencidoTitulo: {
    fontSize: 12,
    letterSpacing: 0.3,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: "#92400E",
    marginBottom: 2,
  },
  vencidoTexto: {
    fontSize: 12,
    lineHeight: 17,
    color: "#A16207",
  },
  vencidoFuerte: {
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: "#92400E",
  },

  // ── (b) y (c) — tarjetas gemelas ───────────────────────────────────────────
  fila: {
    flexDirection: "row",
    gap: sp(8),
    marginBottom: sp(DesignTokens.spacing.md),
  },
  tarjeta: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: sp(8),
    paddingHorizontal: sp(10),
  },
  tarjetaCorte: {
    backgroundColor: DesignTokens.colors.background.secondary,
  },
  tarjetaAlerta: {
    backgroundColor: "#FFFBEB",
  },
  tarjetaEtiqueta: {
    fontSize: 10,
    letterSpacing: 0.5,
    color: DesignTokens.colors.neutral[500],
  },
  tarjetaValor: {
    fontSize: 13,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[700],
    marginTop: 2,
  },
  tarjetaPie: {
    fontSize: 10.5,
    color: DesignTokens.colors.neutral[500],
  },
  textoAlerta: { color: "#92400E" },
  textoAlertaSuave: { color: "#A16207" },
});
