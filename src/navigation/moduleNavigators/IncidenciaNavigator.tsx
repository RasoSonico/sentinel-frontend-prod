import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { Platform, Dimensions } from "react-native";
import IncidentListScreen from "../../modules/incidencia/screens/IncidentListScreen";
import IncidentRegistrationScreen from "../../modules/incidencia/screens/IncidentRegistrationScreen";
import { Incident } from "../../types/incidencia";
import { DesignTokens } from "../../styles/designTokens";

// HEADER UTILITIES
const { width: screenWidth } = Dimensions.get("window");
const isTablet = screenWidth >= 768;

export type IncidenciaStackParamList = {
  IncidentsList: undefined;
  IncidentRegistration: undefined;
  IncidentDetail: { incident: Incident };
};

const Stack = createStackNavigator<IncidenciaStackParamList>();

export const IncidenciaNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="IncidentsList"
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
          fontSize: isTablet ? 28 : 25, // RESPONSIVO IGUAL A AVANCE
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
        name="IncidentsList" 
        component={IncidentListScreen}
        options={{
          title: "Incidencias Registradas",
        }}
      />
      <Stack.Screen 
        name="IncidentRegistration" 
        component={IncidentRegistrationScreen}
        options={{
          title: "Registrar incidencia",
        }}
      />
      {/* TODO: Agregar IncidentDetailScreen cuando se implemente */}
      {/* 
      <Stack.Screen 
        name="IncidentDetail" 
        component={IncidentDetailScreen}
        options={{
          title: "Detalle de Incidencia",
        }}
      />
      */}
    </Stack.Navigator>
  );
};