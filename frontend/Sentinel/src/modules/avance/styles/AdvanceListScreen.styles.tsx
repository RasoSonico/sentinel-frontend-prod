import { StyleSheet, Dimensions } from "react-native";
import { DesignTokens, ColorUtils } from "../../../styles/designTokens";

// RESPONSIVE DESIGN UTILITIES
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
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
  if (isSmallPhone) return Math.max(base * 0.9, 12); // Mínimo 12px
  return base;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.colors.background.secondary,
  },
  indicatorContainer: {
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingTop: DesignTokens.spacing.sm,
  },
  listContent: {
    padding: getResponsiveSpacing(DesignTokens.spacing.lg),
    paddingBottom: getResponsiveSpacing(DesignTokens.spacing["2xl"]),
  },
  emptyListContent: {
    flexGrow: 1,
    padding: getResponsiveSpacing(DesignTokens.spacing.lg),
  },
  headerContainer: {
    marginBottom: getResponsiveSpacing(DesignTokens.spacing["2xl"]),
  },
  constructionName: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize["2xl"]),
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[800],
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.lg),
    includeFontPadding: false,
    lineHeight:
      getResponsiveFontSize(DesignTokens.typography.fontSize["2xl"]) * 1.3,
  },
  summaryContainer: {
    flexDirection: isTablet ? "row" : "row", // MANTENER ROW EN AMBOS
    backgroundColor: DesignTokens.colors.background.primary,
    borderRadius: getResponsiveSpacing(DesignTokens.borderRadius.md),
    padding: getResponsiveSpacing(DesignTokens.spacing.xl),
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.lg),
    ...DesignTokens.shadows.base,
    borderLeftWidth: 4,
    borderLeftColor: DesignTokens.colors.primary[500],
    minHeight: getResponsiveSpacing(80), // ALTURA MÍNIMA RESPONSIVA
  },
  summaryLoading: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DesignTokens.colors.background.primary,
    borderRadius: DesignTokens.borderRadius.md,
    padding: DesignTokens.spacing.xl,
    marginBottom: DesignTokens.spacing.lg,
    justifyContent: "center",
    ...DesignTokens.shadows.sm,
  },
  summaryLoadingText: {
    marginLeft: DesignTokens.spacing.sm,
    color: DesignTokens.colors.neutral[500],
    fontSize: DesignTokens.typography.fontSize.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.xl),
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.primary[600],
    includeFontPadding: false,
    textAlign: "center",
    lineHeight:
      getResponsiveFontSize(DesignTokens.typography.fontSize.xl) * 1.2,
  },
  summaryLabel: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.xs),
    color: DesignTokens.colors.neutral[500],
    marginTop: getResponsiveSpacing(DesignTokens.spacing.xs),
    fontWeight: DesignTokens.typography.fontWeight.medium,
    includeFontPadding: false,
    textAlign: "center",
    lineHeight:
      getResponsiveFontSize(DesignTokens.typography.fontSize.xs) * 1.3,
  },
  filtersContainer: {
    flexDirection: "row",
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.lg),
    flexWrap: "wrap",
    gap: getResponsiveSpacing(DesignTokens.spacing.sm),
  },
  dateFilterContainer: {
    marginTop: getResponsiveSpacing(DesignTokens.spacing.sm),
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.md),
  },
  filterChip: {
    height: getResponsiveSpacing(36), // Altura fija para mejor control
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing.sm), // REDUCIR PADDING PARA MÁS COMPACTO
    borderRadius: getResponsiveSpacing(18), // La mitad de la altura
    backgroundColor: DesignTokens.colors.neutral[100],
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    justifyContent: "center", // CENTRAR VERTICALMENTE
    alignItems: "center", // CENTRAR HORIZONTALMENTE
    minWidth: getResponsiveSpacing(60), // REDUCIR ANCHO MÍNIMO
  },
  activeFilterChip: {
    backgroundColor: DesignTokens.colors.primary[500],
    borderColor: DesignTokens.colors.primary[500],
    ...DesignTokens.shadows.sm,
  },
  filterChipText: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.xs), // REDUCIR A XS PARA QUE QUEPAN
    color: DesignTokens.colors.neutral[600],
    fontWeight: DesignTokens.typography.fontWeight.medium,
    textAlign: "center", // CENTRAR TEXTO
    includeFontPadding: false, // QUITAR PADDING EXTRA EN ANDROID
    textAlignVertical: "center", // CENTRAR VERTICALMENTE EN ANDROID
  },
  activeFilterChipText: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.xs), // REDUCIR A XS PARA QUE QUEPAN
    color: DesignTokens.colors.background.primary,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  advanceItem: {
    backgroundColor: DesignTokens.colors.background.primary,
    borderRadius: getResponsiveSpacing(DesignTokens.borderRadius.md),
    padding: getResponsiveSpacing(DesignTokens.spacing.lg),
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.md),
    ...DesignTokens.shadows.base,
    borderLeftWidth: 4,
    // ✅ borderLeftColor ahora es dinámico - se asigna en el componente según el estado
    minHeight: isTablet ? 140 : 120, // ALTURA MÍNIMA RESPONSIVA
  },
  advanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.md),
    minHeight: isTablet ? 60 : 50, // ALTURA MÍNIMA PARA HEADER
  },
  conceptInfo: {
    flex: 1,
    marginRight: getResponsiveSpacing(DesignTokens.spacing.sm),
    minHeight: isTablet ? 50 : 40, // ESPACIO MÍNIMO PARA TEXTO
  },
  conceptCode: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.xs),
    color: DesignTokens.colors.neutral[400],
    fontWeight: DesignTokens.typography.fontWeight.medium,
    includeFontPadding: false, // QUITAR PADDING EXTRA
    lineHeight:
      getResponsiveFontSize(DesignTokens.typography.fontSize.xs) * 1.3, // LINE HEIGHT EXPLÍCITO
  },
  conceptName: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.base),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[800],
    marginTop: getResponsiveSpacing(4),
    includeFontPadding: false,
    lineHeight:
      getResponsiveFontSize(DesignTokens.typography.fontSize.base) * 1.4, // LINE HEIGHT EXPLÍCITO
  },
  partidaName: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.lg),
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[900],
    marginBottom: getResponsiveSpacing(6),
    includeFontPadding: false, // ✅ QUITAR PADDING EXTRA
    lineHeight:
      getResponsiveFontSize(DesignTokens.typography.fontSize.lg) * 1.3, // LINE HEIGHT AJUSTADO
    maxHeight: getResponsiveFontSize(DesignTokens.typography.fontSize.lg) * 2.6, // MÁXIMO 2 LÍNEAS
  },
  conceptDescription: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.sm),
    color: DesignTokens.colors.neutral[600],
    includeFontPadding: false,
    lineHeight:
      getResponsiveFontSize(DesignTokens.typography.fontSize.sm) * 1.4, // LINE HEIGHT EXPLÍCITO
    maxHeight: getResponsiveFontSize(DesignTokens.typography.fontSize.sm) * 2.8, // MÁXIMO 2 LÍNEAS
  },
  statusChip: {
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing.sm),
    paddingVertical: getResponsiveSpacing(6), // PADDING VERTICAL FIJO
    borderRadius: getResponsiveSpacing(DesignTokens.borderRadius.base),
    minWidth: getResponsiveSpacing(80),
    height: getResponsiveSpacing(28), // ALTURA FIJA
    justifyContent: "center", // CENTRAR VERTICALMENTE
    alignItems: "center", // CENTRAR HORIZONTALMENTE
  },
  pendingChip: {
    backgroundColor: ColorUtils.getStatusBackgroundColor("PENDING"),
  },
  approvedChip: {
    backgroundColor: ColorUtils.getStatusBackgroundColor("APPROVED"),
  },
  rejectedChip: {
    backgroundColor: ColorUtils.getStatusBackgroundColor("REJECTED"),
  },
  statusText: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.xs),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    includeFontPadding: false, // QUITAR PADDING EXTRA
    textAlign: "center", // CENTRAR TEXTO
    textAlignVertical: "center", // CENTRAR VERTICALMENTE EN ANDROID
    lineHeight:
      getResponsiveFontSize(DesignTokens.typography.fontSize.xs) * 1.2, // LINE HEIGHT AJUSTADO
  },
  pendingText: {
    color: ColorUtils.getStatusColor("PENDING"),
  },
  approvedText: {
    color: ColorUtils.getStatusColor("APPROVED"),
  },
  rejectedText: {
    color: ColorUtils.getStatusColor("REJECTED"),
  },
  advanceDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: DesignTokens.spacing.md,
    marginTop: DesignTokens.spacing.sm,
    paddingTop: DesignTokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.neutral[100],
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DesignTokens.colors.neutral[50],
    paddingHorizontal: DesignTokens.spacing.md,
    paddingVertical: DesignTokens.spacing.sm,
    borderRadius: DesignTokens.borderRadius.base,
  },
  quantityLabel: {
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.neutral[500],
    marginRight: DesignTokens.spacing.xs,
    fontWeight: DesignTokens.typography.fontWeight.medium,
  },
  quantityValue: {
    fontSize: DesignTokens.typography.fontSize.sm,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[800],
  },
  dateText: {
    fontSize: DesignTokens.typography.fontSize.xs,
    color: DesignTokens.colors.neutral[500],
    fontWeight: DesignTokens.typography.fontWeight.medium,
  },
  photoContainer: {
    position: "relative",
    marginBottom: DesignTokens.spacing.md,
    borderRadius: DesignTokens.borderRadius.base,
    overflow: "hidden",
  },
  photoThumbnail: {
    width: "100%",
    height: 120,
    borderRadius: DesignTokens.borderRadius.base,
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  photoCountBadge: {
    position: "absolute",
    bottom: DesignTokens.spacing.sm,
    right: DesignTokens.spacing.sm,
    backgroundColor: ColorUtils.withOpacity(
      DesignTokens.colors.neutral[900],
      0.8
    ),
    paddingHorizontal: DesignTokens.spacing.sm,
    paddingVertical: DesignTokens.spacing.xs,
    borderRadius: DesignTokens.borderRadius.md,
  },
  photoCountText: {
    color: DesignTokens.colors.background.primary,
    fontSize: DesignTokens.typography.fontSize.xs,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  notesContainer: {
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.md),
    padding: getResponsiveSpacing(DesignTokens.spacing.md),
    backgroundColor: DesignTokens.colors.neutral[50],
    borderRadius: getResponsiveSpacing(DesignTokens.borderRadius.sm),
    borderLeftWidth: 3,
    borderLeftColor: DesignTokens.colors.primary[200],
    minHeight: getResponsiveSpacing(50), // ALTURA MÍNIMA PARA CONTENEDOR
  },
  notesLabel: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.xs),
    color: DesignTokens.colors.neutral[500],
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.xs),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    includeFontPadding: false, // QUITAR PADDING EXTRA
    lineHeight:
      getResponsiveFontSize(DesignTokens.typography.fontSize.xs) * 1.3,
  },
  notesText: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.sm),
    color: DesignTokens.colors.neutral[700],
    includeFontPadding: false, // ✅ QUITAR PADDING EXTRA
    lineHeight:
      getResponsiveFontSize(DesignTokens.typography.fontSize.sm) * 1.5, // LINE HEIGHT EXPLÍCITO
    minHeight: getResponsiveFontSize(DesignTokens.typography.fontSize.sm) * 1.5, // ALTURA MÍNIMA PARA TEXTO
    flexWrap: "wrap", // PERMITIR WRAP DEL TEXTO
    flex: 1, // OCUPAR ESPACIO DISPONIBLE
  },
  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: DesignTokens.spacing.md,
    paddingTop: DesignTokens.spacing.sm,
  },
  programStatusContainer: {
    alignItems: "flex-start",
  },
  dateContainer: {
    alignItems: "flex-end",
  },
  footerLoader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: DesignTokens.spacing.lg,
  },
  footerLoaderText: {
    marginLeft: DesignTokens.spacing.sm,
    color: DesignTokens.colors.neutral[500],
    fontSize: DesignTokens.typography.fontSize.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: DesignTokens.spacing["3xl"],
  },
  emptyTitle: {
    fontSize: DesignTokens.typography.fontSize.xl,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[700],
    marginTop: DesignTokens.spacing.lg,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.neutral[500],
    textAlign: "center",
    marginTop: DesignTokens.spacing.sm,
    lineHeight: DesignTokens.typography.lineHeight.relaxed,
    maxWidth: 280,
  },
  emptyButton: {
    backgroundColor: DesignTokens.colors.primary[500],
    paddingHorizontal: DesignTokens.spacing["2xl"],
    paddingVertical: DesignTokens.spacing.md,
    borderRadius: DesignTokens.borderRadius.base,
    marginTop: DesignTokens.spacing["2xl"],
    ...DesignTokens.shadows.sm,
  },
  emptyButtonText: {
    color: DesignTokens.colors.background.primary,
    fontSize: DesignTokens.typography.fontSize.base,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  errorTitle: {
    fontSize: DesignTokens.typography.fontSize.xl,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.error[600],
    marginTop: DesignTokens.spacing.lg,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.neutral[600],
    textAlign: "center",
    marginTop: DesignTokens.spacing.sm,
    lineHeight: DesignTokens.typography.lineHeight.relaxed,
    maxWidth: 280,
  },
  retryButton: {
    backgroundColor: DesignTokens.colors.primary[500],
    paddingHorizontal: DesignTokens.spacing["2xl"],
    paddingVertical: DesignTokens.spacing.md,
    borderRadius: DesignTokens.borderRadius.base,
    marginTop: DesignTokens.spacing["2xl"],
    ...DesignTokens.shadows.sm,
  },
  retryButtonText: {
    color: DesignTokens.colors.background.primary,
    fontSize: DesignTokens.typography.fontSize.base,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  loadingText: {
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.neutral[500],
    marginTop: DesignTokens.spacing.md,
    fontWeight: DesignTokens.typography.fontWeight.medium,
  },
  loadingConceptContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: DesignTokens.spacing.xl,
  },
  loadingConceptText: {
    marginLeft: DesignTokens.spacing.sm,
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.neutral[500],
  },

  // FLOATING ACTION BUTTON (FAB) - CONGRUENTE CON HEADER EJECUTIVO
  fab: {
    position: "absolute",
    right: getResponsiveSpacing(20),
    bottom: getResponsiveSpacing(20),
    width: getResponsiveSpacing(56),
    height: getResponsiveSpacing(56),
    borderRadius: getResponsiveSpacing(28),
    backgroundColor: DesignTokens.colors.executive.primary, // MISMO COLOR DEL HEADER
    justifyContent: "center",
    alignItems: "center",
    ...DesignTokens.shadows.lg,
    // SOMBRA CONGRUENTE CON HEADER
    shadowColor: DesignTokens.colors.executive.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: DesignTokens.elevation.md,
    zIndex: DesignTokens.zIndex.fab,
  },
  fabIcon: {
    color: DesignTokens.colors.background.primary,
  },
});

export default styles;
