import React, { useCallback } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { Dimensions } from "react-native";
import { AvanceStackParamList } from "../types";
import AdvanceListScreen from "../../modules/avance/screens/AdvanceListScreen";
import AdvanceRegistrationScreen from "../../modules/avance/screens/AdvanceRegistrationScreen";
import { DesignTokens } from "../../styles/designTokens";
import { useAvancePrefetch } from "src/hooks/data/query/useAvancePrefetch";
import { useFocusEffect } from "@react-navigation/native";

// HEADER UTILITIES
const { width: screenWidth } = Dimensions.get("window");
const isTablet = screenWidth >= 768;

const Stack = createStackNavigator<AvanceStackParamList>();

export const AvanceNavigator: React.FC = () => {
  const { prefetchAvance } = useAvancePrefetch();

  // Prefetch when navigator mounts
  useFocusEffect(
    useCallback(() => {
      prefetchAvance();
    }, [prefetchAvance]),
  );

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
