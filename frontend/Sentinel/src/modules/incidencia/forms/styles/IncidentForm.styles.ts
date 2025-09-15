import { StyleSheet, Dimensions } from "react-native";
import { DesignTokens } from "../../../../styles/designTokens";

// RESPONSIVE DESIGN UTILITIES
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
  container: {
    flex: 1,
  },
  fieldContainer: {
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.sm), // Mismo que LabeledDropdown
  },
  fieldLabel: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.base), // 16px
    fontWeight: DesignTokens.typography.fontWeight.semibold as any, // Mismo cast que QuantityInput
    color: DesignTokens.colors.neutral[900], // Negro consistente
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.xs), // 4px como QuantityInput
  },
  // CAMPO DE DESCRIPCIÓN (COMO NOTESINPUT DE AVANCE)
  textareaContainer: {
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    borderRadius: DesignTokens.borderRadius.base,
    backgroundColor: DesignTokens.colors.background.primary,
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing.md),
    paddingVertical: getResponsiveSpacing(DesignTokens.spacing.sm),
  },
  textarea: {
    height: getResponsiveSpacing(100),
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.base),
    color: DesignTokens.colors.neutral[900],
    textAlignVertical: "top",
    includeFontPadding: false,
  },
  descriptionFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: getResponsiveSpacing(DesignTokens.spacing.xs),
  },
  characterCount: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.xs),
    color: DesignTokens.colors.neutral[500],
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: getResponsiveSpacing(DesignTokens.spacing.xs), // 4px como QuantityInput
    gap: getResponsiveSpacing(DesignTokens.spacing.xs), // Espacio entre icono y texto
  },
  errorText: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.xs), // 12px
    color: DesignTokens.colors.error[500], // Rojo de error consistente
    fontWeight: DesignTokens.typography.fontWeight.medium as any, // Mismo que QuantityInput
  },
  // DROPDOWN STYLES - UNIFORME CON LABELEDDROPDOWN DE AVANCE
  dropdownContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[300], // Mismo que QuantityInput
    borderRadius: DesignTokens.borderRadius.base,
    backgroundColor: DesignTokens.colors.background.primary,
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing.md), // 12px como QuantityInput
    paddingVertical: getResponsiveSpacing(DesignTokens.spacing.sm),
    minHeight: 48, // Misma altura que QuantityInput
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.xs),
  },
  dropdownContainerError: {
    borderColor: DesignTokens.colors.error[500],
  },
  dropdownText: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.base), // 16px
    color: DesignTokens.colors.neutral[900], // Mismo que QuantityInput
    fontWeight: DesignTokens.typography.fontWeight.normal, // Normal como inputs
    flex: 1,
    flexWrap: "wrap",
    lineHeight:
      getResponsiveFontSize(DesignTokens.typography.fontSize.base) * 1.4, // Line height consistente
  },
  placeholderText: {
    color: DesignTokens.colors.neutral[500], // Mismo que QuantityInput placeholder
    fontWeight: DesignTokens.typography.fontWeight.normal,
  },
  dropdownOptions: {
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    borderRadius: DesignTokens.borderRadius.base,
    backgroundColor: DesignTokens.colors.background.primary,
    marginTop: -getResponsiveSpacing(DesignTokens.spacing.xs),
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.sm),
    maxHeight: 200,
    ...DesignTokens.shadows.md, // Sombra más pronunciada
    zIndex: 1000, // Asegurar que aparezca encima
    position: "relative",
  },
  dropdownOption: {
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing.md),
    paddingVertical: getResponsiveSpacing(DesignTokens.spacing.md), // Más padding vertical
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[100],
    minHeight: 44, // Altura mínima para mejor tocabilidad
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
  },
  dropdownOptionText: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.base), // 16px consistente
    color: DesignTokens.colors.neutral[700],
    lineHeight:
      getResponsiveFontSize(DesignTokens.typography.fontSize.base) * 1.4,
    flex: 1,
    flexWrap: "wrap",
    textAlign: "left",
  },
  // CLASIFICACIONES PERSONALIZADAS CON COLORES CONDICIONALES
  classificationsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.xs),
    gap: getResponsiveSpacing(DesignTokens.spacing.xs),
  },
  classificationButton: {
    flex: 1,
    paddingHorizontal: getResponsiveSpacing(6), // Padding muy reducido
    paddingVertical: getResponsiveSpacing(DesignTokens.spacing.sm),
    borderRadius: DesignTokens.borderRadius.sm,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[300],
    backgroundColor: DesignTokens.colors.background.primary,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  classificationButtonText: {
    fontSize: getResponsiveFontSize(11), // Fuente muy pequeña para que quepa
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[700],
    textAlign: "center",
    includeFontPadding: false,
  },
  classificationButtonTextSelected: {
    color: DesignTokens.colors.background.primary,
    fontWeight: DesignTokens.typography.fontWeight.bold,
  },
  infoContainer: {
    backgroundColor: DesignTokens.colors.neutral[50],
    padding: getResponsiveSpacing(DesignTokens.spacing.md),
    borderRadius: DesignTokens.borderRadius.base,
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.xl),
    borderLeftWidth: 3,
    borderLeftColor: DesignTokens.colors.primary[200],
  },
  infoText: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.xs),
    color: DesignTokens.colors.neutral[500],
    lineHeight:
      getResponsiveFontSize(DesignTokens.typography.fontSize.xs) * 1.4,
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.xs),
  },
  // BOTÓN DE ENVÍO COMO ADVANCEFORM (UN SOLO BOTÓN)
  submitButton: {
    backgroundColor: DesignTokens.colors.executive.primary,
    borderRadius: DesignTokens.borderRadius.base,
    paddingVertical: getResponsiveSpacing(DesignTokens.spacing.lg),
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: getResponsiveSpacing(DesignTokens.spacing["5xl"]),
  },
  submitButtonDisabled: {
    backgroundColor: DesignTokens.colors.neutral[400],
  },
  submitButtonText: {
    color: DesignTokens.colors.background.primary,
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.base),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  submitButtonIcon: {
    marginRight: getResponsiveSpacing(DesignTokens.spacing.sm),
  },
  // SECCIÓN DE FORMULARIO
  formSection: {
    flex: 1,
    gap: getResponsiveSpacing(DesignTokens.spacing.xs),
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.lg),
  },
  // ESTILOS OBSOLETOS - ELIMINADOS
  // Ya no usamos buttonContainer ni botones separados
  // El patrón es un solo botón de submit como AdvanceForm
});

export default styles;
