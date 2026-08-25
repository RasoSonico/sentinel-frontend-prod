import { StyleSheet } from "react-native";
import { DesignTokens } from "src/styles/designTokens";
import { fs, lh, sp } from "src/styles/escala";

// Ficha del concepto (L-02, ADR-004 D12). El slate #334155 de "restan N" es
// informativo a propósito: el ámbar queda reservado a la alerta de
// sobre-ejecución, para que no compitan por la misma señal.
export default StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  contenido: {
    paddingHorizontal: sp(DesignTokens.spacing.lg),
    paddingBottom: sp(32),
  },

  cejilla: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: DesignTokens.colors.neutral[500],
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    marginBottom: sp(4),
  },
  // ÚNICA PERILLA del cuerpo del concepto: cambia el número de `fs(...)` y la
  // interlínea lo sigue sola. Era 15/21; el piso de `fs` es 11.
  descripcion: {
    fontSize: fs(12),
    lineHeight: lh(fs(12)),
    color: DesignTokens.colors.neutral[900],
    marginBottom: sp(DesignTokens.spacing.lg),
  },

  bloqueAcumulado: {
    backgroundColor: DesignTokens.colors.background.secondary,
    borderRadius: 10,
    padding: sp(DesignTokens.spacing.md),
    marginBottom: sp(DesignTokens.spacing.lg),
  },
  filaNumeros: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: sp(10),
  },
  alineadoDerecha: {
    alignItems: "flex-end",
  },
  etiqueta: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: DesignTokens.colors.neutral[500],
    marginBottom: 2,
  },
  valorGrande: {
    fontSize: 22,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[900],
  },
  valorMedio: {
    fontSize: 15,
    color: DesignTokens.colors.neutral[600],
  },
  unidad: {
    fontSize: 13,
    fontWeight: DesignTokens.typography.fontWeight.normal,
    color: DesignTokens.colors.neutral[600],
  },

  barraFondo: {
    height: 6,
    borderRadius: 3,
    backgroundColor: DesignTokens.colors.neutral[200],
    overflow: "hidden",
  },
  barraRelleno: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: DesignTokens.colors.success[500],
  },
  barraSobreejecutada: {
    backgroundColor: DesignTokens.colors.warning[500],
  },

  filaPie: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: sp(6),
  },
  pct: {
    fontSize: 13,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[900],
  },
  pctSobre: {
    color: DesignTokens.colors.warning[600],
  },
  restante: {
    fontSize: 13,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.executive.secondary,
  },

  // Cabecera plegable. El título conserva su peso, la pista va tenue y el
  // galón cierra a la derecha: se lee "qué es · cómo está · se abre".
  cabeceraSeccion: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: sp(8),
  },
  tituloSeccion: {
    fontSize: 13,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[600],
  },
  pistaSeccion: {
    flex: 1,
    fontSize: 12,
    color: DesignTokens.colors.neutral[400],
    marginLeft: sp(8),
  },
  chevronSeccion: {
    color: DesignTokens.colors.neutral[500],
  },
  vacio: {
    fontSize: 13,
    fontStyle: "italic",
    color: DesignTokens.colors.neutral[500],
    marginBottom: sp(DesignTokens.spacing.md),
  },

  carga: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: sp(9),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DesignTokens.colors.neutral[200],
  },
  cargaHoy: {
    backgroundColor: DesignTokens.colors.primary[50],
    borderRadius: 6,
    paddingHorizontal: sp(8),
    marginHorizontal: -sp(8),
    borderBottomColor: "transparent",
  },
  cargaFecha: {
    width: sp(88),
    fontSize: 13,
    color: DesignTokens.colors.neutral[600],
  },
  cargaFechaHoy: {
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.primary[700],
  },
  cargaVolumen: {
    flex: 1,
    fontSize: 14,
    color: DesignTokens.colors.neutral[900],
  },
  iconoFoto: {
    color: DesignTokens.colors.neutral[500],
    width: 18,
    textAlign: "right",
  },
  iconoHueco: {
    width: 18,
  },

  verHistorial: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: sp(12),
  },
  verHistorialTexto: {
    fontSize: 13,
    color: DesignTokens.colors.primary[600],
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },

  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DesignTokens.colors.primary[600],
    borderRadius: 10,
    paddingVertical: sp(14),
    marginTop: sp(DesignTokens.spacing.md),
  },
  ctaIcono: {
    color: "#FFFFFF",
    marginRight: 8,
  },
  ctaTexto: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
});
