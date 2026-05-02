import { StyleSheet } from "react-native";
import { DesignTokens } from "../../../../styles/designTokens";

const advanceFormStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formSection: {
    flex: 1,
    gap: DesignTokens.spacing.xs,
    marginBottom: DesignTokens.spacing.lg,
  },
  advancedSection: {
    marginBottom: DesignTokens.spacing.lg,
  },
  photoSection: {
    marginBottom: DesignTokens.spacing.lg,
  },
});

export default advanceFormStyles;
