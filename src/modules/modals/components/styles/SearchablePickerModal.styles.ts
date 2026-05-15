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
    maxHeight: screenHeight * 0.85,
    flex: 1,
    ...DesignTokens.shadows.lg,
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingTop: DesignTokens.spacing.sm,
    paddingBottom: DesignTokens.spacing.md,
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
  searchContainer: {
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingBottom: DesignTokens.spacing.md,
  },
  searchInput: {
    backgroundColor: DesignTokens.colors.neutral[100],
    borderRadius: DesignTokens.borderRadius.base,
    paddingHorizontal: DesignTokens.spacing.md,
    paddingVertical: DesignTokens.spacing.sm,
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.neutral[900],
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: DesignTokens.spacing.lg,
  },
  itemContainer: {
    backgroundColor: DesignTokens.colors.background.primary,
    borderRadius: DesignTokens.borderRadius.md,
    marginBottom: DesignTokens.spacing.sm,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    overflow: "hidden",
  },
  itemContainerExpanded: {
    borderColor: DesignTokens.colors.primary[300],
    backgroundColor: DesignTokens.colors.primary[50],
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: DesignTokens.spacing.md,
  },
  itemNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: DesignTokens.borderRadius.full,
    backgroundColor: DesignTokens.colors.neutral[200],
    alignItems: "center",
    justifyContent: "center",
    marginRight: DesignTokens.spacing.md,
  },
  itemNumberBadgeExpanded: {
    backgroundColor: DesignTokens.colors.primary[500],
  },
  itemNumber: {
    fontSize: DesignTokens.typography.fontSize.xs,
    fontWeight: DesignTokens.typography.fontWeight.semibold as any,
    color: DesignTokens.colors.neutral[600],
  },
  itemNumberExpanded: {
    color: DesignTokens.colors.background.primary,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemPreview: {
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.neutral[700],
    lineHeight:
      DesignTokens.typography.fontSize.sm *
      DesignTokens.typography.lineHeight.normal,
  },
  itemPreviewExpanded: {
    color: DesignTokens.colors.neutral[800],
  },
  expandIcon: {
    marginLeft: DesignTokens.spacing.sm,
    alignSelf: "center",
  },
  expandedContent: {
    paddingHorizontal: DesignTokens.spacing.md,
    paddingBottom: DesignTokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.neutral[200],
    marginTop: DesignTokens.spacing.sm,
    paddingTop: DesignTokens.spacing.md,
  },
  expandedText: {
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.neutral[800],
    lineHeight:
      DesignTokens.typography.fontSize.base *
      DesignTokens.typography.lineHeight.relaxed,
  },
  selectButton: {
    backgroundColor: DesignTokens.colors.primary[500],
    borderRadius: DesignTokens.borderRadius.base,
    paddingVertical: DesignTokens.spacing.sm,
    paddingHorizontal: DesignTokens.spacing.lg,
    alignItems: "center",
    marginTop: DesignTokens.spacing.md,
  },
  selectButtonText: {
    color: DesignTokens.colors.background.primary,
    fontSize: DesignTokens.typography.fontSize.sm,
    fontWeight: DesignTokens.typography.fontWeight.semibold as any,
  },
  noResults: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: DesignTokens.spacing["3xl"],
  },
  noResultsText: {
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.neutral[500],
  },
  tapHint: {
    fontSize: DesignTokens.typography.fontSize.xs,
    color: DesignTokens.colors.neutral[400],
    marginTop: DesignTokens.spacing.xs,
  },
});
