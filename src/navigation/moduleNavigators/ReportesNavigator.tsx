import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { ReportesStackParamList } from "../types";
import ReportSelectionScreen from "../../modules/reportes/screens/ReportSelectionScreen";
import AdvanceReportScreen from "../../modules/avance/screens/AdvanceReportScreen";
import ReporteWizardRoute from "../../modules/reportes/screens/ReporteWizardRoute";
import ReporteDetailScreen from "../../modules/reportes/screens/ReporteDetailScreen";
import { DesignTokens } from "../../styles/designTokens";
import { fs } from "../../styles/escala";

const Stack = createStackNavigator<ReportesStackParamList>();

/**
 * Tab Reportes (ADR-003 Fase 1, ampliado por el ADR-006).
 *
 * El entregable subió de speed dial escondido a stack de primer nivel en la
 * Fase 1; aquí gana el wizard de captura y el detalle de consulta.
 */
export const ReportesNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="ReportSelection"
      screenOptions={{
        headerStyle: {
          backgroundColor: DesignTokens.colors.executive.primary,
          shadowColor: DesignTokens.colors.neutral[900],
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 4,
        },
        headerTintColor: DesignTokens.colors.background.primary,
        headerTitleStyle: {
          fontWeight: DesignTokens.typography.fontWeight.bold,
          // D10.1 del ADR-006: estaba en `isTablet ? 28 : 25`, dos números
          // sueltos fuera de la escala tipográfica. Ahora pasa por `fs()` como
          // todo lo demás, con su curva suave y su piso de legibilidad.
          fontSize: fs(DesignTokens.typography.fontSize["2xl"]),
          color: DesignTokens.colors.background.primary,
        },
        headerTitleAlign: "center" as const,
        headerBackTitle: "",
        cardStyle: {
          backgroundColor: DesignTokens.colors.background.secondary,
        },
      }}
    >
      <Stack.Screen
        name="ReportSelection"
        component={ReportSelectionScreen}
        options={{ title: "Reportes" }}
      />

      <Stack.Screen
        name="AdvanceReport"
        component={AdvanceReportScreen}
        options={{ title: "Reporte de Avance" }}
      />

      {/* El wizard trae su propio armazón —header navy con ✕ y subheader de
          obra y fecha—, así que va sin el header del stack y en presentación
          modal: es una sesión cerrada que se abre, se completa y se descarta.
          `gestureEnabled: false` porque el gesto de arrastrar hacia abajo
          descartaría la captura sin pasar por la confirmación del ✕. */}
      <Stack.Screen
        name="ReporteWizard"
        component={ReporteWizardRoute}
        options={{
          headerShown: false,
          presentation: "modal",
          gestureEnabled: false,
        }}
      />

      <Stack.Screen
        name="ReporteDetalle"
        component={ReporteDetailScreen}
        options={{ title: "Reporte de actividades" }}
      />
    </Stack.Navigator>
  );
};

export default ReportesNavigator;
