import { StyleSheet, Dimensions } from "react-native";
import { DesignTokens } from "../../../styles/designTokens";

// RESPONSIVE DESIGN UTILITIES
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const isTablet = screenWidth >= 768;
const isSmallPhone = screenWidth < 375;

// COLORES INMOBILIARIA
const REAL_ESTATE_COLORS = {
  primary: "#1a365d", // Azul marino profesional
  secondary: "#2d4a5c", // Azul grisáceo
  accent: "#c53030", // Rojo elegante para acentos
  gold: "#d69e2e", // Dorado para premium
  lightBlue: "#e6f3ff", // Azul muy claro
  darkBlue: "#0f2738", // Azul muy oscuro
};

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

export default StyleSheet.create({
  // CONTENEDOR PRINCIPAL CON GRADIENTE INMOBILIARIO
  container: {
    flex: 1,
    backgroundColor: REAL_ESTATE_COLORS.primary, // Fondo azul marino
  },

  // FONDO CON ELEMENTOS VISUALES MODERNOS
  backgroundDecoration: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },

  // ELEMENTOS DECORATIVOS INMOBILIARIOS
  decorativeCircle1: {
    position: "absolute",
    top: -getResponsiveSpacing(80),
    right: -getResponsiveSpacing(80),
    width: getResponsiveSpacing(160),
    height: getResponsiveSpacing(160),
    borderRadius: getResponsiveSpacing(80),
    backgroundColor: REAL_ESTATE_COLORS.gold,
    opacity: 0.15,
  },

  decorativeCircle2: {
    position: "absolute",
    bottom: -getResponsiveSpacing(100),
    left: -getResponsiveSpacing(50),
    width: getResponsiveSpacing(120),
    height: getResponsiveSpacing(120),
    borderRadius: getResponsiveSpacing(60),
    backgroundColor: REAL_ESTATE_COLORS.secondary,
    opacity: 0.2,
  },

  decorativeCircle3: {
    position: "absolute",
    top: getResponsiveSpacing(120),
    left: -getResponsiveSpacing(40),
    width: getResponsiveSpacing(80),
    height: getResponsiveSpacing(80),
    borderRadius: getResponsiveSpacing(40),
    backgroundColor: REAL_ESTATE_COLORS.lightBlue,
    opacity: 0.3,
  },

  // CONTENIDO PRINCIPAL CON MEJOR DISTRIBUCIÓN
  content: {
    flex: 1,
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing["3xl"]), // 32px
    paddingVertical: getResponsiveSpacing(DesignTokens.spacing["3xl"]), // 32px - Reducido para dar más espacio al footer
    justifyContent: "space-between",
    zIndex: 1,
  },

  // CONTENEDOR DEL LOGO CON ANIMACIÓN VISUAL
  logoContainer: {
    alignItems: "center",
    marginTop: getResponsiveSpacing(DesignTokens.spacing["6xl"]), // 64px
    paddingBottom: getResponsiveSpacing(DesignTokens.spacing["4xl"]), // 40px
  },

  // CONTENEDOR DEL LOGO PARA LOGO BLANCO
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: getResponsiveSpacing(DesignTokens.spacing["2xl"]), // 24px
    paddingVertical: getResponsiveSpacing(DesignTokens.spacing.xl), // 20px
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing["2xl"]), // 24px
    backgroundColor: "rgba(255, 255, 255, 0.1)", // Fondo semi-transparente para contraste
    borderRadius: getResponsiveSpacing(24),
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    ...DesignTokens.shadows.lg,
  },

  logo: {
    width: getResponsiveSpacing(isTablet ? 160 : 120), // Responsive
    height: getResponsiveSpacing(isTablet ? 160 : 120),
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.md), // 12px
  },

  // TÍTULO PRINCIPAL INMOBILIARIO
  title: {
    fontSize: getResponsiveFontSize(isTablet ? 48 : 36), // 36px/48px
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: "#FFFFFF", // Blanco para contraste
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.sm), // 8px
    textAlign: "center",
    letterSpacing: 3, // Más espaciado para elegancia
    includeFontPadding: false,
    lineHeight: getResponsiveFontSize(isTablet ? 48 : 36) * 1.1,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // SUBTÍTULO INMOBILIARIO
  subtitle: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.lg), // 18px
    color: REAL_ESTATE_COLORS.lightBlue, // Azul claro
    textAlign: "center",
    fontWeight: DesignTokens.typography.fontWeight.medium,
    letterSpacing: 0.8,
    lineHeight: DesignTokens.typography.fontSize.lg * 1.4,
    maxWidth: getResponsiveSpacing(300),
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // CONTENEDOR DE FORMULARIO EJECUTIVO SIN CUADRO
  formContainer: {
    // Sin fondo, sin bordes, sin sombras - más sobrio y ejecutivo
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing.lg), // 16px
    marginVertical: getResponsiveSpacing(DesignTokens.spacing["2xl"]), // 24px
  },

  // HEADER DEL FORMULARIO
  formHeader: {
    alignItems: "center",
    marginBottom: getResponsiveSpacing(DesignTokens.spacing["2xl"]), // 24px
  },

  welcomeText: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.xl), // 20px
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: "#FFFFFF", // Blanco para contraste en fondo oscuro
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.xs), // 4px
    textAlign: "center",
    letterSpacing: 0.8,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  instructionText: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.sm), // 14px
    color: REAL_ESTATE_COLORS.lightBlue, // Azul claro para mejor contraste
    textAlign: "center",
    lineHeight: DesignTokens.typography.fontSize.sm * 1.5,
    fontWeight: DesignTokens.typography.fontWeight.medium,
    opacity: 0.9,
  },

  // BOTÓN DE MICROSOFT DELGADO Y ELEGANTE
  microsoftButton: {
    backgroundColor: "rgba(255, 255, 255, 0.15)", // Fondo semi-transparente sutil
    borderRadius: getResponsiveSpacing(DesignTokens.borderRadius.lg), // 16px
    paddingVertical: getResponsiveSpacing(DesignTokens.spacing.md), // 12px - REDUCIDO de 20px
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing["4xl"]), // 40px - ALARGADO de 32px
    marginVertical: getResponsiveSpacing(DesignTokens.spacing.lg), // 16px - REDUCIDO de 20px
    borderWidth: 1.5,
    borderColor: REAL_ESTATE_COLORS.gold, // Borde dorado sutil
    position: "relative",
    overflow: "hidden",
    // Sombra sutil para elegancia
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // EFECTO GRADIENTE PARA EL BOTÓN
  microsoftButtonGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    borderRadius: getResponsiveSpacing(DesignTokens.borderRadius.lg),
  },

  // CONTENIDO DEL BOTÓN MICROSOFT
  microsoftButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },

  // TEXTO DEL BOTÓN MICROSOFT
  microsoftButtonText: {
    color: "#FFFFFF",
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.lg), // 18px - Más grande
    fontWeight: DesignTokens.typography.fontWeight.bold,
    letterSpacing: 0.8,
    marginLeft: getResponsiveSpacing(DesignTokens.spacing.sm),
  },

  // ICONO DEL BOTÓN MICROSOFT
  microsoftButtonIcon: {
    backgroundColor: "#FFFFFF",
    borderRadius: getResponsiveSpacing(4),
    padding: getResponsiveSpacing(4),
  },

  // TEXTO INFORMATIVO EJECUTIVO
  infoContainer: {
    marginTop: getResponsiveSpacing(DesignTokens.spacing.lg), // 16px
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing.md), // 12px
    paddingVertical: getResponsiveSpacing(DesignTokens.spacing.sm), // 8px
    backgroundColor: "rgba(255, 255, 255, 0.1)", // Fondo muy sutil
    borderRadius: getResponsiveSpacing(DesignTokens.borderRadius.base), // 8px
    borderLeftWidth: 2,
    borderLeftColor: REAL_ESTATE_COLORS.gold,
  },

  infoText: {
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.8)", // Blanco semi-transparente
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.xs), // 12px
    fontWeight: DesignTokens.typography.fontWeight.medium,
    lineHeight: DesignTokens.typography.fontSize.xs * 1.5,
  },

  // FOOTER INMOBILIARIO VISIBLE Y ELEGANTE
  footerContainer: {
    alignItems: "center",
    paddingTop: getResponsiveSpacing(DesignTokens.spacing["2xl"]), // 24px
    paddingBottom: getResponsiveSpacing(DesignTokens.spacing.xl), // 20px - Para asegurar visibilidad
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)", // Línea semi-transparente
    marginTop: getResponsiveSpacing(DesignTokens.spacing.lg), // 16px
    minHeight: getResponsiveSpacing(80), // Altura mínima para visibilidad
  },

  footer: {
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.8)", // Más opaco para mejor visibilidad
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.xs), // 12px
    fontWeight: DesignTokens.typography.fontWeight.medium,
    letterSpacing: 0.5,
    marginTop: getResponsiveSpacing(DesignTokens.spacing.xl), // 20px - SEPARACIÓN CLARA
  },

  // BADGE DE SEGURIDAD VISIBLE
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing.md), // 12px
    paddingVertical: getResponsiveSpacing(DesignTokens.spacing.sm), // 8px - Más padding
    backgroundColor: "rgba(255, 255, 255, 0.2)", // Más opaco para visibilidad
    borderRadius: getResponsiveSpacing(DesignTokens.borderRadius.full), // Pill shape
    borderWidth: 1,
    borderColor: REAL_ESTATE_COLORS.gold, // Borde dorado
  },

  securityText: {
    fontSize: getResponsiveFontSize(12), // Más grande para visibilidad
    color: "#FFFFFF", // Blanco sólido
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    marginLeft: getResponsiveSpacing(6),
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
