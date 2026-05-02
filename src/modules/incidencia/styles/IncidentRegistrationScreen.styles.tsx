import { StyleSheet, Dimensions } from "react-native";
import { DesignTokens } from "../../../styles/designTokens";

// RESPONSIVE DESIGN UTILITIES
const { width: screenWidth } = Dimensions.get("window");
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
  if (isSmallPhone) return Math.max(base * 0.9, 12);
  return base;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.colors.background.primary,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: DesignTokens.colors.background.primary,
  },
  loadingText: {
    marginTop: getResponsiveSpacing(DesignTokens.spacing.lg),
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.base),
    color: DesignTokens.colors.neutral[500],
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing["3xl"]),
  },
  errorTitle: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.xl),
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.error[600],
    marginTop: getResponsiveSpacing(DesignTokens.spacing.lg),
    textAlign: "center",
  },
  errorMessage: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.base),
    color: DesignTokens.colors.neutral[600],
    marginTop: getResponsiveSpacing(DesignTokens.spacing.sm),
    textAlign: "center",
    lineHeight: DesignTokens.typography.lineHeight.relaxed,
    maxWidth: 280,
  },
  retryButton: {
    backgroundColor: DesignTokens.colors.primary[500],
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing["2xl"]),
    paddingVertical: getResponsiveSpacing(DesignTokens.spacing.md),
    borderRadius: DesignTokens.borderRadius.base,
    marginTop: getResponsiveSpacing(DesignTokens.spacing["2xl"]),
    ...DesignTokens.shadows.sm,
  },
  retryButtonText: {
    color: DesignTokens.colors.background.primary,
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.base),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  header: {
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.xl),
  },
  constructionName: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.xl),
    fontWeight: DesignTokens.typography.fontWeight.bold,
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.sm),
    color: DesignTokens.colors.neutral[900],
  },
  headerDescription: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.sm),
    color: DesignTokens.colors.neutral[500],
    lineHeight:
      getResponsiveFontSize(DesignTokens.typography.fontSize.sm) *
      DesignTokens.typography.lineHeight.normal,
  },
  contentContainer: {
    flex: 1,
    padding: getResponsiveSpacing(DesignTokens.spacing.lg),
  },
  infoContainer: {
    backgroundColor: DesignTokens.colors.neutral[50],
    padding: getResponsiveSpacing(DesignTokens.spacing.md),
    borderRadius: DesignTokens.borderRadius.base,
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.xl),
    borderLeftWidth: 3,
    borderLeftColor: DesignTokens.colors.primary[200],
  },
  infoText: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.xs),
    color: DesignTokens.colors.neutral[500],
    lineHeight:
      getResponsiveFontSize(DesignTokens.typography.fontSize.xs) * 1.4,
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.xs),
  },
});

export default styles;
