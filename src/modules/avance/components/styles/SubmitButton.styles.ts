import { StyleSheet } from "react-native";
import { DesignTokens } from "../../../../styles/designTokens";

const submitButtonStyles = StyleSheet.create({
  button: {
    backgroundColor: DesignTokens.colors.executive.primary,
    borderRadius: DesignTokens.borderRadius.base,
    paddingVertical: DesignTokens.spacing.lg,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: DesignTokens.spacing["5xl"],
  },
  buttonDisabled: {
    backgroundColor: DesignTokens.colors.neutral[400],
  },
  icon: {
    marginRight: DesignTokens.spacing.sm,
  },
  text: {
    color: DesignTokens.colors.background.primary,
    fontSize: DesignTokens.typography.fontSize.base,
    fontWeight: DesignTokens.typography.fontWeight.semibold as any,
  },
});

export default submitButtonStyles;
