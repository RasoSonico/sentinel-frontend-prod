import { StyleSheet } from "react-native";
import { DesignTokens } from "../../../../styles/designTokens";

const labeledDropdownStyles = StyleSheet.create({
  container: {
    marginBottom: DesignTokens.spacing.sm,
  },
  label: {
    fontSize: DesignTokens.typography.fontSize.base,
    fontWeight: DesignTokens.typography.fontWeight.semibold as any,
    marginBottom: DesignTokens.spacing.xs,
    color: DesignTokens.colors.neutral[900],
  },
  loadingContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: "center",
    alignItems: "center",
    gap: DesignTokens.spacing.sm
  },
  loadingText: {
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.neutral[500],
  },
});

export default labeledDropdownStyles;
