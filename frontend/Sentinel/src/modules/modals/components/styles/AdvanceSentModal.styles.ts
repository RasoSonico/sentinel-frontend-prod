import { StyleSheet } from "react-native";
import { DesignTokens } from "../../../../styles/designTokens";

export default StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: DesignTokens.colors.background.primary,
    borderRadius: DesignTokens.borderRadius.xl,
    padding: DesignTokens.spacing["3xl"],
    alignItems: "center",
    ...DesignTokens.shadows.lg,
  },
  icon: {
    marginBottom: DesignTokens.spacing.lg,
  },
  title: {
    fontSize: DesignTokens.typography.fontSize["2xl"],
    fontWeight: DesignTokens.typography.fontWeight.bold as any,
    marginBottom: DesignTokens.spacing.sm,
    color: DesignTokens.colors.neutral[900],
  },
  subtitle: {
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.neutral[600],
    marginBottom: DesignTokens.spacing["2xl"],
    textAlign: "center",
    lineHeight: DesignTokens.typography.fontSize.base * DesignTokens.typography.lineHeight.normal,
  },
  registerButton: {
    backgroundColor: DesignTokens.colors.executive.primary,
    borderRadius: DesignTokens.borderRadius.base,
    paddingVertical: DesignTokens.spacing.md,
    paddingHorizontal: DesignTokens.spacing["4xl"],
    marginBottom: DesignTokens.spacing.sm,
    width: "100%",
  },
  registerButtonText: {
    color: DesignTokens.colors.background.primary,
    fontWeight: DesignTokens.typography.fontWeight.bold as any,
    fontSize: DesignTokens.typography.fontSize.base,
    textAlign: "center",
  },
  homeButton: {
    backgroundColor: DesignTokens.colors.success[500],
    borderRadius: DesignTokens.borderRadius.base,
    paddingVertical: DesignTokens.spacing.md,
    paddingHorizontal: DesignTokens.spacing["4xl"],
    marginBottom: DesignTokens.spacing.xs / 2,
    width: "100%",
  },
  homeButtonText: {
    color: DesignTokens.colors.background.primary,
    fontWeight: DesignTokens.typography.fontWeight.bold as any,
    fontSize: DesignTokens.typography.fontSize.base,
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    top: DesignTokens.spacing.md,
    right: DesignTokens.spacing.md,
  },
});
