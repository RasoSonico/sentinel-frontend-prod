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

// Zona oscura ejecutiva (ADR-003 D3): resumen del día y de la obra.
// Franja full-width bajo el header de navegación; viaja con el scroll.
export default StyleSheet.create({
  container: {
    backgroundColor: DesignTokens.colors.executive.secondary,
    paddingHorizontal: sp(DesignTokens.spacing.lg),
    paddingVertical: sp(DesignTokens.spacing.md),
    marginBottom: sp(DesignTokens.spacing.sm),
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  topLeft: {
    flex: 1,
    paddingRight: sp(10),
  },
  title: {
    color: DesignTokens.colors.background.primary,
    fontSize: 14,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 3,
  },
  pctBlock: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  pctLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    letterSpacing: 0.8,
  },
  pctValue: {
    color: DesignTokens.colors.background.primary,
    fontSize: 16,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  // Esquina PROG.: mismo tamaño de etiqueta que AVANCE pero valor más
  // discreto — el ejecutado es el protagonista; el programado es la vara.
  progBlock: {
    alignItems: "flex-end",
    marginLeft: sp(14),
  },
  progValue: {
    color: "#7FD1C1",
    // MISMO tamaño que pctValue: el código decía 18 contra 16 mientras el
    // comentario prometía un valor "más discreto", así que el programado salía
    // más grande que el avance y le robaba el protagonismo.
    fontSize: 16,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  // Marca de programado sobre la barra. Teal = plano contractual (el morado
  // queda reservado a producción, Fase 3).
  // La marca vive en un CONTENEDOR sobre la barra, no dentro: barBg tiene
  // overflow:"hidden" para recortar el radio del relleno, y cualquier cosa
  // dentro se recortaría. Así la marca sobresale sin ensanchar la barra.
  barWrap: {
    position: "relative",
    justifyContent: "center",
  },
  marcaPrograma: {
    position: "absolute",
    top: sp(8) - 4, // barBg tiene marginTop sp(8); la marca sube 4px sobre ella
    marginLeft: -2, // centra la marca de 4px sobre el valor exacto
    width: 4,
    height: 13,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.45)",
    backgroundColor: "#5EEAD4", // teal claro: la barra de la franja es oscura
    borderRadius: 2,
    zIndex: 2,
  },
  barBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.35)",
    marginTop: sp(8),
    overflow: "hidden",
  },
  barFill: {
    height: 5,
    borderRadius: 3,
    backgroundColor: DesignTokens.colors.primary[400],
  },
  importesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  importeText: {
    color: DesignTokens.colors.primary[300],
    fontSize: 10.5,
    fontVariant: ["tabular-nums"],
  },
  // Teal apagado: pertenece al plano contractual —califica al PROGRAMA, no al
  // avance— pero es una advertencia de alcance, no una cifra que deba competir
  // con las de arriba.
  alcancePrograma: {
    color: "#7FD1C1",
    opacity: 0.75,
    fontSize: 10,
    marginTop: 3,
  },
  statsRow: {
    flexDirection: "row",
    gap: sp(6),
    marginTop: sp(10),
  },
  stat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: DesignTokens.borderRadius.base,
    paddingVertical: sp(7),
    alignItems: "center",
  },
  statValue: {
    color: DesignTokens.colors.background.primary,
    fontSize: 17,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10.5,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: "row",
    gap: sp(8),
    marginTop: sp(10),
  },
  btnReporte: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    backgroundColor: DesignTokens.colors.success[500],
    borderRadius: DesignTokens.borderRadius.base,
    paddingVertical: sp(9),
    alignItems: "center",
    justifyContent: "center",
  },
  btnReporteText: {
    color: DesignTokens.colors.background.primary,
    fontSize: 12.5,
    fontWeight: DesignTokens.typography.fontWeight.medium,
  },
  btnIncidencia: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[500],
    borderRadius: DesignTokens.borderRadius.base,
    paddingVertical: sp(8),
    alignItems: "center",
    justifyContent: "center",
  },
  btnIncidenciaText: {
    color: "#E2E8F0",
    fontSize: 12.5,
    fontWeight: DesignTokens.typography.fontWeight.medium,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: sp(DesignTokens.spacing.sm),
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: DesignTokens.borderRadius.sm,
    paddingHorizontal: sp(DesignTokens.spacing.sm),
    paddingVertical: 4,
  },
  offlineText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
  },
});
