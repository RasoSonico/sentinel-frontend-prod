import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { Dimensions, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SabanaStackParamList } from "../types";
import SabanaScreen from "../../modules/avance/screens/SabanaScreen";
import AdvanceListScreen from "../../modules/avance/screens/AdvanceListScreen";
import AdvanceRegistrationScreen from "../../modules/avance/screens/AdvanceRegistrationScreen";
import PendingSyncScreen from "../../modules/avance/screens/PendingSyncScreen";
import IncidentListScreen from "../../modules/incidencia/screens/IncidentListScreen";
import IncidentRegistrationScreen from "../../modules/incidencia/screens/IncidentRegistrationScreen";
import { DesignTokens } from "../../styles/designTokens";

const { width: screenWidth } = Dimensions.get("window");
const isTablet = screenWidth >= 768;

const Stack = createStackNavigator<SabanaStackParamList>();

/**
 * Stack del home del CONTRATISTA (ADR-003 Fase 1): la sábana es la pantalla
 * inicial y absorbe historial de avances, registro, cola de sincronización y
 * las pantallas de incidencias (la tab Incidencias dejó de existir).
 */
export const SabanaNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="SabanaHome"
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
        name="SabanaHome"
        component={SabanaScreen}
        options={{ title: "Sábana de Avance" }}
      />

      <Stack.Screen
        name="AvancesList"
        component={AdvanceListScreen}
        options={{ title: "Avances" }}
      />

      <Stack.Screen
        name="AvanceRegistration"
        component={AdvanceRegistrationScreen}
        options={{ title: "Registrar avance" }}
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

      <Stack.Screen
        name="IncidentsList"
        component={IncidentListScreen}
        options={{ title: "Incidencias Registradas" }}
      />

      <Stack.Screen
        name="IncidentRegistration"
        component={IncidentRegistrationScreen}
        options={{ title: "Registrar incidencia" }}
      />

      {/* TODO: Agregar IncidentDetailScreen cuando se implemente */}
    </Stack.Navigator>
  );
};

export default SabanaNavigator;
