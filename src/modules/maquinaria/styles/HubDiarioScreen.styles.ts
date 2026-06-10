import { Dimensions, StyleSheet } from "react-native";
import { DesignTokens } from "src/styles/designTokens";

const { width: screenWidth } = Dimensions.get("window");
const isTablet = screenWidth >= 768;
const isSmallPhone = screenWidth < 375;

export const getResponsiveSpacing = (base: number) => {
  if (isTablet) return base * 1.5;
  if (isSmallPhone) return base * 0.8;
  return base;
};

export const getResponsiveFontSize = (base: number) => {
  if (isTablet) return base * 1.2;
  if (isSmallPhone) return Math.max(base * 0.9, 12);
  return base;
};

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.colors.background.secondary,
  },
  listContent: {
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing.md),
    paddingBottom: getResponsiveSpacing(80),
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing.xl),
  },
  emptyTitle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[500],
    textAlign: "center",
    marginTop: DesignTokens.spacing.md,
  },
  emptySubtitle: {
    fontSize: getResponsiveFontSize(13),
    color: DesignTokens.colors.neutral[400],
    textAlign: "center",
    marginTop: DesignTokens.spacing.sm,
  },
  fabContainer: {
    position: "absolute",
    bottom: getResponsiveSpacing(24),
    right: getResponsiveSpacing(16),
    alignItems: "center",
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: DesignTokens.colors.executive.primary,
    alignItems: "center",
    justifyContent: "center",
    ...DesignTokens.shadows.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
