import { StyleSheet } from "react-native";
import { DesignTokens } from "../../../../styles/designTokens";

const styles = StyleSheet.create({
  // BottomSheet container styles
  bottomSheetContainer: {
    ...DesignTokens.shadows.lg,
    elevation: DesignTokens.elevation.xxl,
    zIndex: DesignTokens.zIndex.bottomSheet,
  },
  bottomSheetBackground: {
    backgroundColor: DesignTokens.colors.background.primary,
    borderTopLeftRadius: DesignTokens.components.bottomSheet.borderRadius,
    borderTopRightRadius: DesignTokens.components.bottomSheet.borderRadius,
  },
  handleIndicator: {
    backgroundColor: DesignTokens.colors.neutral[400],
    width: 48,
    height: 4,
    borderRadius: DesignTokens.borderRadius.sm,
  },

  // Content container
  contentContainer: {
    backgroundColor: DesignTokens.colors.neutral[200],
    paddingTop: DesignTokens.spacing.md,
    paddingBottom: DesignTokens.spacing["6xl"],
  },

  // Fixed header with cleaner design
  fixedHeader: {
    backgroundColor: DesignTokens.colors.background.primary,
    paddingBottom: DesignTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[100],
  },

  // New: Header with title only
  headerTitleSection: {
    marginBottom: DesignTokens.spacing.md,
  },

  // New: Date and status in same row
  dateStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: DesignTokens.spacing.xl,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: "#308320ff",
    borderBottomWidth: 1,
    borderBottomColor: "#E1E5E9",
    position: "relative",
  },
  headerTitle: {
    fontSize: DesignTokens.typography.fontSize.xl,
    fontWeight: DesignTokens.typography.fontWeight.semibold as any,
    color: DesignTokens.colors.neutral[800],
    letterSpacing: -0.3,
  },
  subheaderSection: {
    paddingHorizontal: DesignTokens.spacing.xl,
    paddingTop: DesignTokens.spacing.lg,
    paddingBottom: DesignTokens.spacing.sm,
  },
  statusContainer: {
    alignItems: "flex-end",
  },

  dateContainer: {
    flex: 1,
  },

  // Clean item container - minimal styling
  itemContainer: {
    backgroundColor: DesignTokens.colors.background.primary,
    marginHorizontal: DesignTokens.spacing.lg,
    marginBottom: DesignTokens.spacing.sm,
    padding: DesignTokens.spacing.lg,
    borderRadius: DesignTokens.borderRadius.md,
  },

  // Item label - Minimalista
  itemLabel: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: DesignTokens.spacing.sm,
    justifyContent: "flex-start",
  },
  editIconContainer: {
    padding: DesignTokens.spacing.xs,
    marginLeft: "auto",
    borderRadius: DesignTokens.borderRadius.sm,
    backgroundColor: DesignTokens.colors.primary[50],
  },
  labelText: {
    fontSize: DesignTokens.typography.fontSize.sm,
    fontWeight: DesignTokens.typography.fontWeight.medium as any,
    color: DesignTokens.colors.neutral[600],
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // Values - Minimalista
  valueText: {
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.neutral[800],
    lineHeight:
      DesignTokens.typography.fontSize.sm *
      DesignTokens.typography.lineHeight.tight,
    fontWeight: DesignTokens.typography.fontWeight.normal as any,
    paddingLeft: DesignTokens.spacing["4xl"] - DesignTokens.spacing.sm,
  },

  // Volume specific - Destacado
  volumeValue: {
    fontSize: DesignTokens.typography.fontSize.lg,
    fontWeight: DesignTokens.typography.fontWeight.semibold as any,
    color: DesignTokens.colors.neutral[800],
    paddingLeft: DesignTokens.spacing["4xl"] - DesignTokens.spacing.sm,
    marginBottom: DesignTokens.spacing.sm,
    letterSpacing: -0.5,
  },
  amountValue: {
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.success[600],
    fontWeight: DesignTokens.typography.fontWeight.semibold as any,
    paddingLeft: DesignTokens.spacing["4xl"] - DesignTokens.spacing.sm,
  },

  // Comment specific - Minimalista
  commentText: {
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.neutral[500],
    lineHeight:
      DesignTokens.typography.fontSize.base *
      DesignTokens.typography.lineHeight.normal,
    paddingLeft: DesignTokens.spacing["4xl"] - DesignTokens.spacing.sm,
  },

  // Status badge - Minimalista
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: DesignTokens.spacing.md,
    paddingVertical: DesignTokens.spacing.xs,
    borderRadius: DesignTokens.borderRadius.md,
  },
  approvedBadge: {
    backgroundColor: DesignTokens.colors.success[50],
  },
  rejectedBadge: {
    backgroundColor: DesignTokens.colors.error[50],
  },
  pendingBadge: {
    backgroundColor: DesignTokens.colors.warning[50],
  },

  // Status text - Minimalista
  statusText: {
    fontSize: DesignTokens.typography.fontSize.xs,
    fontWeight: DesignTokens.typography.fontWeight.semibold as any,
    textTransform: "capitalize",
  },
  approvedText: {
    color: DesignTokens.colors.success[600],
  },
  rejectedText: {
    color: DesignTokens.colors.error[600],
  },
  pendingText: {
    color: DesignTokens.colors.warning[600],
  },

  // Input styles
  volumeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing.md,
    paddingLeft: DesignTokens.spacing["4xl"] - DesignTokens.spacing.sm,
  },
  volumeInput: {
    flex: 1,
    fontSize: DesignTokens.typography.fontSize.base,
    fontWeight: DesignTokens.typography.fontWeight.semibold as any,
    color: DesignTokens.colors.neutral[800],
    paddingVertical: DesignTokens.spacing.sm,
    paddingHorizontal: DesignTokens.spacing.md,
    backgroundColor: DesignTokens.colors.background.primary,
    borderRadius: DesignTokens.borderRadius.base,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[300],
  },
  commentsInput: {
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.neutral[500],
    paddingVertical: DesignTokens.spacing.md,
    paddingHorizontal: DesignTokens.spacing.md,
    backgroundColor: DesignTokens.colors.background.primary,
    borderRadius: DesignTokens.borderRadius.base,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[300],
    minHeight: 80,
    textAlignVertical: "top",
    marginLeft: DesignTokens.spacing["4xl"] - DesignTokens.spacing.sm,
  },
  inputError: {
    borderColor: DesignTokens.colors.error[500],
    backgroundColor: DesignTokens.colors.error[50],
  },
  unitText: {
    fontSize: DesignTokens.typography.fontSize.base,
    fontWeight: DesignTokens.typography.fontWeight.medium as any,
    color: DesignTokens.colors.neutral[500],
    minWidth: 40,
  },

  // Error styles
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: DesignTokens.spacing.sm,
    marginLeft: DesignTokens.spacing["4xl"] - DesignTokens.spacing.sm,
    gap: DesignTokens.spacing.xs + 2,
  },
  errorText: {
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.error[500],
    flex: 1,
  },
  actionButtonsContainer: {
    backgroundColor: DesignTokens.colors.background.tertiary,
    borderTopWidth: 0.5,
    borderTopColor: DesignTokens.colors.background.tertiary,
    paddingBottom: DesignTokens.spacing.lg,
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: DesignTokens.spacing.xl,
    paddingTop: DesignTokens.spacing.lg,
    paddingBottom: DesignTokens.spacing.xs,
    gap: DesignTokens.spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: DesignTokens.spacing.lg - 2,
    paddingHorizontal: DesignTokens.spacing.lg,
    backgroundColor: DesignTokens.colors.background.primary,
    borderRadius: DesignTokens.borderRadius.md,
    borderColor: DesignTokens.colors.primary[500],
    borderWidth: 1,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: DesignTokens.typography.fontSize.base,
    fontWeight: DesignTokens.typography.fontWeight.semibold as any,
    color: DesignTokens.colors.primary[500],
  },
  saveButton: {
    flex: 1,
    paddingVertical: DesignTokens.spacing.lg - 2,
    paddingHorizontal: DesignTokens.spacing.lg,
    backgroundColor: DesignTokens.colors.executive.primary,
    borderRadius: DesignTokens.borderRadius.md,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: DesignTokens.colors.neutral[400],
  },
  saveButtonText: {
    fontSize: DesignTokens.typography.fontSize.base,
    fontWeight: DesignTokens.typography.fontWeight.semibold as any,
    color: DesignTokens.colors.background.primary,
  },
});

export default styles;
