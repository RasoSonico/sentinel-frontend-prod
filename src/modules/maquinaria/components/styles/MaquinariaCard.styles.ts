import { Dimensions, StyleSheet } from "react-native";
import { DesignTokens } from "src/styles/designTokens";

const { width: screenWidth } = Dimensions.get("window");
const isTablet = screenWidth >= 768;
const isSmallPhone = screenWidth < 375;

const sp = (base: number) => {
  if (isTablet) return base * 1.5;
  if (isSmallPhone) return base * 0.8;
  return base;
};

const fs = (base: number) => {
  if (isTablet) return base * 1.2;
  if (isSmallPhone) return Math.max(base * 0.9, 12);
  return base;
};

export default StyleSheet.create({
  card: {
    backgroundColor: DesignTokens.colors.background.primary,
    borderRadius: sp(DesignTokens.borderRadius.md),
    marginBottom: sp(DesignTokens.spacing.sm),
    borderLeftWidth: 4,
    ...DesignTokens.shadows.base,
  },
  cardContent: {
    paddingHorizontal: sp(DesignTokens.spacing.lg),
    paddingVertical: sp(DesignTokens.spacing.md),
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: sp(DesignTokens.spacing.xs),
  },
  titleBlock: {
    flex: 1,
    marginRight: sp(DesignTokens.spacing.sm),
  },
  tipoMarca: {
    fontSize: fs(15),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[800],
  },
  modelo: {
    fontSize: fs(12),
    color: DesignTokens.colors.neutral[500],
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    gap: sp(DesignTokens.spacing.xs),
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: sp(6),
    paddingVertical: 2,
    borderRadius: DesignTokens.borderRadius.sm,
  },
  badgeText: {
    fontSize: fs(10),
    fontWeight: DesignTokens.typography.fontWeight.medium,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: sp(DesignTokens.spacing.xs),
    gap: sp(DesignTokens.spacing.xs),
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: fs(13),
    color: DesignTokens.colors.neutral[600],
    flex: 1,
  },
  reconciliacionBanner: {
    backgroundColor: DesignTokens.colors.error[50],
    borderRadius: DesignTokens.borderRadius.sm,
    padding: sp(DesignTokens.spacing.sm),
    marginTop: sp(DesignTokens.spacing.sm),
    flexDirection: "row",
    alignItems: "center",
    gap: sp(DesignTokens.spacing.xs),
  },
  reconciliacionText: {
    flex: 1,
    fontSize: fs(12),
    color: DesignTokens.colors.error[700],
    fontWeight: DesignTokens.typography.fontWeight.medium,
  },
  actionsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.neutral[100],
    marginTop: sp(DesignTokens.spacing.sm),
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: sp(DesignTokens.spacing.sm),
    gap: sp(4),
  },
  actionBtnDivider: {
    borderLeftWidth: 1,
    borderLeftColor: DesignTokens.colors.neutral[100],
  },
  actionBtnText: {
    fontSize: fs(12),
    fontWeight: DesignTokens.typography.fontWeight.medium,
    color: DesignTokens.colors.executive.primary,
  },
  actionBtnTextDanger: {
    color: DesignTokens.colors.error[500],
  },
});
