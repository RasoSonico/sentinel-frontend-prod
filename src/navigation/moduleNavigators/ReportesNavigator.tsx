import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { Dimensions } from "react-native";
import { ReportesStackParamList } from "../types";
import ReportSelectionScreen from "../../modules/avance/screens/ReportSelectionScreen";
import AdvanceReportScreen from "../../modules/avance/screens/AdvanceReportScreen";
import { DesignTokens } from "../../styles/designTokens";

const { width: screenWidth } = Dimensions.get("window");
const isTablet = screenWidth >= 768;

const Stack = createStackNavigator<ReportesStackParamList>();

/**
 * Tab Reportes (ADR-003 Fase 1): el entregable sube de speed dial escondido
 * a stack de primer nivel.
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
          fontSize: isTablet ? 28 : 25,
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
    </Stack.Navigator>
  );
};

export default ReportesNavigator;
