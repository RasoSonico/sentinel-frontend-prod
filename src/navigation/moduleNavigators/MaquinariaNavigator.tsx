import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { Dimensions } from "react-native";
import { MaquinariaStackParamList } from "../types";
import HubDiarioScreen from "../../modules/maquinaria/screens/HubDiarioScreen";
import AltaNuevaMaquinariaScreen from "../../modules/maquinaria/screens/AltaNuevaMaquinariaScreen";
import ReactivarMaquinariaScreen from "../../modules/maquinaria/screens/ReactivarMaquinariaScreen";
import { DesignTokens } from "../../styles/designTokens";

const { width: screenWidth } = Dimensions.get("window");
const isTablet = screenWidth >= 768;

const Stack = createStackNavigator<MaquinariaStackParamList>();

export const MaquinariaNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="HubDiario"
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
        name="HubDiario"
        component={HubDiarioScreen}
        options={{ title: "Maquinaria" }}
      />
      <Stack.Screen
        name="AltaNuevaMaquinaria"
        component={AltaNuevaMaquinariaScreen}
        options={{ title: "Registrar maquinaria" }}
      />
      <Stack.Screen
        name="ReactivarMaquinaria"
        component={ReactivarMaquinariaScreen}
        options={{ title: "Reactivar maquinaria" }}
      />
    </Stack.Navigator>
  );
};

export default MaquinariaNavigator;
