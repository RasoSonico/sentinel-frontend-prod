// Design Tokens - SENTINEL

export const DesignTokens = {
  // SISTEMA DE COLORES FIGMA
  colors: {
    // Colores primarios
    primary: {
      50: "#EBF4FF",
      100: "#DBEAFE",
      200: "#BFDBFE",
      300: "#93C5FD",
      400: "#60A5FA",
      500: "#3B82F6", // Color principal
      600: "#2563EB",
      700: "#1D4ED8",
      800: "#1E40AF",
      900: "#1E3A8A",
    },

    // Estados
    success: {
      50: "#ECFDF5",
      100: "#D1FAE5",
      200: "#A7F3D0",
      300: "#6EE7B7",
      400: "#34D399",
      500: "#10B981", // Verde éxito
      600: "#059669",
      700: "#047857",
      800: "#065F46",
      900: "#064E3B",
    },

    warning: {
      50: "#FFFBEB",
      100: "#FEF3C7",
      200: "#FDE68A",
      300: "#FCD34D",
      400: "#FBBF24",
      500: "#F59E0B", // Amarillo advertencia
      600: "#D97706",
      700: "#B45309",
      800: "#92400E",
      900: "#78350F",
    },

    error: {
      50: "#FEF2F2",
      100: "#FEE2E2",
      200: "#FECACA",
      300: "#FCA5A5",
      400: "#F87171",
      500: "#EF4444", // Rojo error
      600: "#DC2626",
      700: "#B91C1C",
      800: "#991B1B",
      900: "#7F1D1D",
    },

    // Grises
    neutral: {
      50: "#F9FAFB",
      100: "#F3F4F6",
      200: "#E5E7EB",
      300: "#D1D5DB",
      400: "#9CA3AF",
      500: "#6B7280",
      600: "#4B5563",
      700: "#374151",
      800: "#1F2937",
      900: "#111827",
    },

    // Fondos y superficies
    background: {
      primary: "#FFFFFF",
      secondary: "#F9FAFB",
      tertiary: "#F3F4F6",
    },

    // Colores específicos de la app
    construction: "#8B5CF6", // Violeta para construcción
    advance: "#10B981", // Verde para avances
    incident: "#EF4444", // Rojo para incidencias

    // HEADERS
    executive: {
      primary: "#1E293B", // Slate 800 - Azul gris oscuro profesional
      secondary: "#334155", // Slate 700 - Gris azulado medio
      accent: "#0F172A", // Slate 900 - Azul gris muy oscuro
      light: "#475569", // Slate 600 - Para elementos secundarios
    },
  },

  // ESPACIADO
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    "2xl": 24,
    "3xl": 32,
    "4xl": 40,
    "5xl": 48,
    "6xl": 64,
  },

  // TIPOGRAFÍA
  typography: {
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      "2xl": 24,
      "3xl": 30,
      "4xl": 36,
    },
    fontWeight: {
      normal: "400" as const,
      medium: "500" as const,
      semibold: "600" as const,
      bold: "700" as const,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
    },
  },

  // BORDER RADIUS
  borderRadius: {
    none: 0,
    sm: 6,
    base: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },

  // SOMBRAS MODERNAS
  shadows: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    base: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
  },

  // Z-INDEX Y ELEVACIÓN
  zIndex: {
    modal: 1000,
    bottomSheet: 900,
    overlay: 800,
    fab: 700,
    header: 100,
    dropdown: 50,
    card: 1,
  },

  elevation: {
    none: 0,
    sm: 2,
    base: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
  },

  // COMPONENTES ESPECÍFICOS
  components: {
    card: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: "#FFFFFF",
    },
    button: {
      height: 48,
      borderRadius: 8,
      paddingHorizontal: 16,
    },
    input: {
      height: 48,
      borderRadius: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
    },
    chip: {
      height: 32,
      borderRadius: 16,
      paddingHorizontal: 12,
    },
    bottomSheet: {
      borderRadius: 20,
      elevation: 24,
    },
    fab: {
      size: 56,
      borderRadius: 28,
      elevation: 8,
    },
  },
} as const;

// UTILIDADES DE COLOR
export const ColorUtils = {
  // Función para obtener color con opacidad
  withOpacity: (color: string, opacity: number) =>
    `${color}${Math.round(opacity * 255)
      .toString(16)
      .padStart(2, "0")}`,

  // Estados de color comunes
  getStatusColor: (
    status: "PENDING" | "APPROVED" | "REJECTED" | "completed" | "onSchedule"
  ) => {
    switch (status) {
      case "APPROVED":
      case "completed":
        return DesignTokens.colors.success[500];
      case "PENDING":
      case "onSchedule":
        return DesignTokens.colors.warning[500];
      case "REJECTED":
        return DesignTokens.colors.error[500];
      default:
        return DesignTokens.colors.neutral[400];
    }
  },

  getStatusBackgroundColor: (
    status: "PENDING" | "APPROVED" | "REJECTED" | "completed" | "onSchedule"
  ) => {
    switch (status) {
      case "APPROVED":
      case "completed":
        return DesignTokens.colors.success[50];
      case "PENDING":
      case "onSchedule":
        return DesignTokens.colors.warning[50];
      case "REJECTED":
        return DesignTokens.colors.error[50];
      default:
        return DesignTokens.colors.neutral[50];
    }
  },

  // ✅ NUEVA FUNCIÓN PARA BORDES LATERALES DE CARDS
  getStatusBorderColor: (
    status: "PENDING" | "APPROVED" | "REJECTED" | "completed" | "onSchedule"
  ) => {
    switch (status) {
      case "APPROVED":
      case "completed":
        return DesignTokens.colors.success[500]; // Verde
      case "PENDING":
      case "onSchedule":
        return DesignTokens.colors.warning[500]; // Amarillo
      case "REJECTED":
        return DesignTokens.colors.error[500]; // Rojo
      default:
        return DesignTokens.colors.neutral[300]; // Gris por defecto
    }
  },
};
