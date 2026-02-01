import { StyleSheet, Dimensions } from "react-native";
import { DesignTokens } from "../../../../styles/designTokens";

const { height: screenHeight } = Dimensions.get("window");

export default StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: DesignTokens.colors.background.primary,
    borderTopLeftRadius: DesignTokens.borderRadius.xl,
    borderTopRightRadius: DesignTokens.borderRadius.xl,
    maxHeight: screenHeight * 0.7,
    ...DesignTokens.shadows.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingTop: DesignTokens.spacing.lg,
    paddingBottom: DesignTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[200],
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: DesignTokens.borderRadius.full,
    backgroundColor: DesignTokens.colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginRight: DesignTokens.spacing.md,
  },
  title: {
    fontSize: DesignTokens.typography.fontSize.lg,
    fontWeight: DesignTokens.typography.fontWeight.semibold as any,
    color: DesignTokens.colors.neutral[900],
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: DesignTokens.borderRadius.full,
    backgroundColor: DesignTokens.colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  contentContainer: {
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingTop: DesignTokens.spacing.lg,
    paddingBottom: DesignTokens.spacing["3xl"],
  },
  contentText: {
    fontSize: DesignTokens.typography.fontSize.base,
    lineHeight: DesignTokens.typography.fontSize.base * DesignTokens.typography.lineHeight.relaxed,
    color: DesignTokens.colors.neutral[700],
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: DesignTokens.colors.neutral[300],
    borderRadius: DesignTokens.borderRadius.full,
    alignSelf: "center",
    marginTop: DesignTokens.spacing.sm,
    marginBottom: DesignTokens.spacing.xs,
  },
});
