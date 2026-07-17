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
