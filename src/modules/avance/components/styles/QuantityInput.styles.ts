import { StyleSheet } from "react-native";
import { DesignTokens } from "../../../../styles/designTokens";

const quantityInputStyles = StyleSheet.create({
  container: {
    marginBottom: DesignTokens.spacing.sm,
  },
  label: {
    fontSize: DesignTokens.typography.fontSize.base,
    fontWeight: DesignTokens.typography.fontWeight.semibold as any,
    marginBottom: DesignTokens.spacing.xs,
    color: DesignTokens.colors.neutral[900],
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing.sm,
  },
  input: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[300],
    borderRadius: DesignTokens.borderRadius.base,
    paddingHorizontal: DesignTokens.spacing.md,
    backgroundColor: DesignTokens.colors.background.primary,
    height: 48,
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.neutral[900],
  },
  unitInput: {
    color: DesignTokens.colors.neutral[500],
    backgroundColor: DesignTokens.colors.background.secondary,
    borderRadius: DesignTokens.borderRadius.base,
    paddingHorizontal: DesignTokens.spacing.md,
    width: 120,
    height: 48,
    fontSize: DesignTokens.typography.fontSize.base,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: DesignTokens.spacing.xs,
    gap: DesignTokens.spacing.xs,
  },
  errorText: {
    color: DesignTokens.colors.error[500],
    fontSize: DesignTokens.typography.fontSize.xs,
    fontWeight: DesignTokens.typography.fontWeight.medium as any,
  },
});

export default quantityInputStyles;
