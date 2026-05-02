import { StyleSheet, Dimensions } from "react-native";
import { DesignTokens } from "../../../../styles/designTokens";

// RESPONSIVE DESIGN UTILITIES (consistente con AdvanceListScreen)
const { width: screenWidth } = Dimensions.get("window");
const isTablet = screenWidth >= 768;
const isSmallPhone = screenWidth < 375;

// RESPONSIVE SPACING
const getResponsiveSpacing = (base: number) => {
  if (isTablet) return base * 1.5;
  if (isSmallPhone) return base * 0.8;
  return base;
};

// RESPONSIVE TYPOGRAPHY
const getResponsiveFontSize = (base: number) => {
  if (isTablet) return base * 1.2;
  if (isSmallPhone) return Math.max(base * 0.9, 12);
  return base;
};

const styles = StyleSheet.create({
  // CARD PRINCIPAL - ESTILO IGUAL A ADVANCELISTSCREEN (SIN MARGIN HORIZONTAL)
  card: {
    backgroundColor: DesignTokens.colors.background.primary,
    borderRadius: getResponsiveSpacing(DesignTokens.borderRadius.md),
    padding: getResponsiveSpacing(DesignTokens.spacing.lg),
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.md),
    ...DesignTokens.shadows.base,
    borderLeftWidth: 4, // ✅ BORDE LATERAL COMO ADVANCELISTSCREEN
    // borderLeftColor se asignará dinámicamente
    minHeight: isTablet ? 140 : 120,
    // SIN marginHorizontal porque el padding viene del FlatList
  },
  
  // HEADER SIMILAR A ADVANCELISTSCREEN (MARGIN REDUCIDO)
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.sm), // REDUCIDO de md a sm
    minHeight: isTablet ? 60 : 50,
  },
  
  headerInfo: {
    flex: 1,
    marginRight: getResponsiveSpacing(DesignTokens.spacing.sm),
    minHeight: isTablet ? 50 : 40,
  },
  
  // ESTILOS DE DETALLES ELIMINADOS PARA REDUCIR ALTURA DE CARD
  
  // SECCIÓN DE COMENTARIOS COMO ADVANCELISTSCREEN
  commentsContainer: {
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.md),
    padding: getResponsiveSpacing(DesignTokens.spacing.md),
    backgroundColor: DesignTokens.colors.neutral[50],
    borderRadius: getResponsiveSpacing(DesignTokens.borderRadius.sm),
    borderLeftWidth: 3,
    borderLeftColor: DesignTokens.colors.primary[200],
    minHeight: getResponsiveSpacing(50),
  },
  
  commentsLabel: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.xs),
    color: DesignTokens.colors.neutral[500],
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.xs),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    includeFontPadding: false,
    lineHeight: getResponsiveFontSize(DesignTokens.typography.fontSize.xs) * 1.3,
  },
  
  commentsText: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.sm),
    color: DesignTokens.colors.neutral[700],
    includeFontPadding: false,
    lineHeight: getResponsiveFontSize(DesignTokens.typography.fontSize.sm) * 1.5,
    minHeight: getResponsiveFontSize(DesignTokens.typography.fontSize.sm) * 1.5,
    flexWrap: "wrap",
    flex: 1,
  },
  
  // SECCIÓN INFERIOR COMO ADVANCELISTSCREEN
  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: DesignTokens.spacing.md,
    paddingTop: DesignTokens.spacing.sm,
  },
  
  statusContainer: {
    alignItems: "flex-start",
  },
  
  dateContainer: {
    alignItems: "flex-end",
  },
  
  dateText: {
    fontSize: DesignTokens.typography.fontSize.xs,
    color: DesignTokens.colors.neutral[500],
    fontWeight: DesignTokens.typography.fontWeight.medium,
  },
  
  // ID DE INCIDENCIA EN BOTTOM SECTION
  incidentIdText: {
    fontSize: DesignTokens.typography.fontSize.xs,
    color: DesignTokens.colors.neutral[600],
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
});

export default styles;