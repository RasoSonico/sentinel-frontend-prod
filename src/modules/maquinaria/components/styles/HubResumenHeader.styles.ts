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

export default StyleSheet.create({
  container: {
    backgroundColor: DesignTokens.colors.executive.primary,
    paddingHorizontal: sp(15),
    paddingTop: sp(13),
    paddingBottom: sp(14),
    marginHorizontal: -sp(DesignTokens.spacing.md),
  },
  title: {
    color: DesignTokens.colors.background.primary,
    fontSize: 13.5,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  barraFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 9,
  },
  barra: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
  },
  barraRelleno: {
    height: 6,
    borderRadius: 3,
    backgroundColor: DesignTokens.colors.background.primary,
  },
  barraTexto: {
    color: DesignTokens.colors.background.primary,
    fontSize: 13,
    fontWeight: DesignTokens.typography.fontWeight.bold,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: sp(DesignTokens.spacing.sm),
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: DesignTokens.borderRadius.sm,
    paddingHorizontal: sp(DesignTokens.spacing.sm),
    paddingVertical: 4,
  },
  offlineText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
  },
});
