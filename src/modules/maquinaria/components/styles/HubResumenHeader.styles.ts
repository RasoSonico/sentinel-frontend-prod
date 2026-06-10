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

export default StyleSheet.create({
  container: {
    backgroundColor: DesignTokens.colors.executive.primary,
    paddingHorizontal: sp(DesignTokens.spacing.lg),
    paddingVertical: sp(DesignTokens.spacing.md),
    marginBottom: sp(DesignTokens.spacing.sm),
    marginHorizontal: -sp(DesignTokens.spacing.md),
  },
  title: {
    color: DesignTokens.colors.background.primary,
    fontSize: 13,
    fontWeight: DesignTokens.typography.fontWeight.medium,
    marginBottom: sp(DesignTokens.spacing.sm),
    opacity: 0.8,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stat: {
    alignItems: "center",
    flex: 1,
    borderRadius: DesignTokens.borderRadius.md,
    paddingVertical: sp(6),
  },
  statActive: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  statInactive: {
    opacity: 0.4,
  },
  activeIndicator: {
    width: 16,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 1,
    marginTop: 4,
  },
  statValue: {
    color: DesignTokens.colors.background.primary,
    fontSize: 22,
    fontWeight: DesignTokens.typography.fontWeight.bold,
  },
  statLabel: {
    color: DesignTokens.colors.background.primary,
    fontSize: 10,
    opacity: 0.7,
    textAlign: "center",
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: sp(4),
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
