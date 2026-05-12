import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { Dimensions, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AvanceStackParamList } from "../types";
import AdvanceListScreen from "../../modules/avance/screens/AdvanceListScreen";
import AdvanceRegistrationScreen from "../../modules/avance/screens/AdvanceRegistrationScreen";
import ReportSelectionScreen from "../../modules/avance/screens/ReportSelectionScreen";
import AdvanceReportScreen from "../../modules/avance/screens/AdvanceReportScreen";
import PendingSyncScreen from "../../modules/avance/screens/PendingSyncScreen";
import { DesignTokens } from "../../styles/designTokens";

// HEADER UTILITIES
const { width: screenWidth } = Dimensions.get("window");
const isTablet = screenWidth >= 768;

const Stack = createStackNavigator<AvanceStackParamList>();

export const AvanceNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="AvancesList"
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
          fontSize: isTablet ? 28 : 25, // RESPONSIVO
          color: DesignTokens.colors.background.primary,
        },
        headerTitleAlign: "center" as const, // CENTRAR TÍTULO
        headerBackTitle: "", // OCULTAR TEXTO DE BACK EN iOS
        cardStyle: {
          backgroundColor: DesignTokens.colors.background.secondary,
        },
      }}
    >
      <Stack.Screen
        name="AvancesList"
        component={AdvanceListScreen}
        options={{
          title: "Avances Registrados",
        }}
      />

      <Stack.Screen
        name="AvanceRegistration"
        component={AdvanceRegistrationScreen}
        options={{
          title: "Registrar avance",
        }}
      />

      <Stack.Screen
        name="ReportSelection"
        component={ReportSelectionScreen}
        options={{
          title: "Reportes",
        }}
      />

      <Stack.Screen
        name="AdvanceReport"
        component={AdvanceReportScreen}
        options={{
          title: "Reporte de Avance",
        }}
      />

      <Stack.Screen
        name="PendingSync"
        component={PendingSyncScreen}
        options={({ navigation }) => ({
          title: "Cola de sincronización",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginLeft: 16, padding: 4 }}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={DesignTokens.colors.background.primary}
              />
            </TouchableOpacity>
          ),
        })}
      />

      {/*
      <Stack.Screen
        name="AvanceDetail"
        component={AdvanceDetailScreen}
        options={({ route }) => ({
          title: route.params?.title || "Detalle de avance",
        })}
      />
      */}
    </Stack.Navigator>
  );
};

export default AvanceNavigator;
