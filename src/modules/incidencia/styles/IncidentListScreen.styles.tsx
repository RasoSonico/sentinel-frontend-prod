import { StyleSheet, Dimensions } from "react-native";
import { DesignTokens, ColorUtils } from "../../../styles/designTokens";

// RESPONSIVE DESIGN UTILITIES
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const isTablet = screenWidth >= 768;
const isSmallPhone = screenWidth < 375;

// RESPONSIVE SPACING
const getResponsiveSpacing = (base: number) => {
  if (isTablet) return base * 1.5;
  if (isSmallPhone) return base * 0.8;
  return base;
};

// RESPONSIVE TYPOGRAPHY
const getResponsiveFontSize = (base: number) => {
  if (isTablet) return base * 1.2;
  if (isSmallPhone) return Math.max(base * 0.9, 12); // Mínimo 12px
  return base;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.colors.background.secondary,
  },
  listContent: {
    padding: getResponsiveSpacing(DesignTokens.spacing.lg),
    paddingBottom: getResponsiveSpacing(DesignTokens.spacing["2xl"]),
  },
  emptyListContent: {
    flexGrow: 1,
    padding: getResponsiveSpacing(DesignTokens.spacing.lg),
  },
  headerContainer: {
    marginBottom: getResponsiveSpacing(DesignTokens.spacing["2xl"]),
  },
  title: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize["2xl"]),
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[800],
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.lg),
    includeFontPadding: false,
    lineHeight:
      getResponsiveFontSize(DesignTokens.typography.fontSize["2xl"]) * 1.3,
  },
  summaryContainer: {
    flexDirection: isTablet ? "row" : "row", // MANTENER ROW EN AMBOS
    backgroundColor: DesignTokens.colors.background.primary,
    borderRadius: getResponsiveSpacing(DesignTokens.borderRadius.md),
    padding: getResponsiveSpacing(DesignTokens.spacing.xl),
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.lg),
    ...DesignTokens.shadows.base,
    borderLeftWidth: 4,
    borderLeftColor: DesignTokens.colors.incident, // Color específico para incidencias
    minHeight: getResponsiveSpacing(80),
  },
  summaryLoading: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DesignTokens.colors.background.primary,
    borderRadius: DesignTokens.borderRadius.md,
    padding: DesignTokens.spacing.xl,
    marginBottom: DesignTokens.spacing.lg,
    justifyContent: "center",
    ...DesignTokens.shadows.sm,
  },
  summaryLoadingText: {
    marginLeft: DesignTokens.spacing.sm,
    color: DesignTokens.colors.neutral[500],
    fontSize: DesignTokens.typography.fontSize.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.xl),
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.incident, // Color específico para incidencias
    includeFontPadding: false,
    textAlign: "center",
    lineHeight:
      getResponsiveFontSize(DesignTokens.typography.fontSize.xl) * 1.2,
  },
  summaryLabel: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.xs),
    color: DesignTokens.colors.neutral[500],
    marginTop: getResponsiveSpacing(DesignTokens.spacing.xs),
    fontWeight: DesignTokens.typography.fontWeight.medium,
    includeFontPadding: false,
    textAlign: "center",
    lineHeight:
      getResponsiveFontSize(DesignTokens.typography.fontSize.xs) * 1.3,
  },
  filtersContainer: {
    flexDirection: "row",
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.lg),
    // Removed flexWrap for horizontal scroll implementation
    gap: getResponsiveSpacing(DesignTokens.spacing.sm),
  },
  dateFilterContainer: {
    marginTop: getResponsiveSpacing(DesignTokens.spacing.sm),
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.md),
  },
  activeFiltersBadgeContainer: {
    marginTop: getResponsiveSpacing(DesignTokens.spacing.xs),
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.sm),
  },
  footerLoader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: DesignTokens.spacing.lg,
  },
  footerLoaderText: {
    marginLeft: DesignTokens.spacing.sm,
    color: DesignTokens.colors.neutral[500],
    fontSize: DesignTokens.typography.fontSize.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: DesignTokens.spacing["3xl"],
  },
  emptyTitle: {
    fontSize: DesignTokens.typography.fontSize.xl,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[700],
    marginTop: DesignTokens.spacing.lg,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.neutral[500],
    textAlign: "center",
    marginTop: DesignTokens.spacing.sm,
    lineHeight: DesignTokens.typography.lineHeight.relaxed,
    maxWidth: 280,
  },
  emptyButton: {
    backgroundColor: DesignTokens.colors.incident, // Color específico para incidencias
    paddingHorizontal: DesignTokens.spacing["2xl"],
    paddingVertical: DesignTokens.spacing.md,
    borderRadius: DesignTokens.borderRadius.base,
    marginTop: DesignTokens.spacing["2xl"],
    ...DesignTokens.shadows.sm,
  },
  emptyButtonText: {
    color: DesignTokens.colors.background.primary,
    fontSize: DesignTokens.typography.fontSize.base,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  errorTitle: {
    fontSize: DesignTokens.typography.fontSize.xl,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.error[600],
    marginTop: DesignTokens.spacing.lg,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.neutral[600],
    textAlign: "center",
    marginTop: DesignTokens.spacing.sm,
    lineHeight: DesignTokens.typography.lineHeight.relaxed,
    maxWidth: 280,
  },
  retryButton: {
    backgroundColor: DesignTokens.colors.primary[500],
    paddingHorizontal: DesignTokens.spacing["2xl"],
    paddingVertical: DesignTokens.spacing.md,
    borderRadius: DesignTokens.borderRadius.base,
    marginTop: DesignTokens.spacing["2xl"],
    ...DesignTokens.shadows.sm,
  },
  retryButtonText: {
    color: DesignTokens.colors.background.primary,
    fontSize: DesignTokens.typography.fontSize.base,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  loadingText: {
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.neutral[500],
    marginTop: DesignTokens.spacing.md,
    fontWeight: DesignTokens.typography.fontWeight.medium,
  },
  // FLOATING ACTION BUTTON (FAB) - CONGRUENTE CON HEADER EJECUTIVO
  fab: {
    position: "absolute",
    right: getResponsiveSpacing(20),
    bottom: getResponsiveSpacing(20),
    width: getResponsiveSpacing(56),
    height: getResponsiveSpacing(56),
    borderRadius: getResponsiveSpacing(28),
    backgroundColor: DesignTokens.colors.executive.primary, // MISMO COLOR DEL HEADER
    justifyContent: "center",
    alignItems: "center",
    ...DesignTokens.shadows.lg,
    // SOMBRA CONGRUENTE CON HEADER
    shadowColor: DesignTokens.colors.executive.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: DesignTokens.elevation.md,
    zIndex: DesignTokens.zIndex.fab,
  },
  fabIcon: {
    color: DesignTokens.colors.background.primary,
  },
});

export default styles;