import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { Dimensions } from "react-native";
import { SabanaStackParamList } from "../types";
import SabanaScreen from "../../modules/avance/screens/SabanaScreen";
import { DesignTokens } from "../../styles/designTokens";

const { width: screenWidth } = Dimensions.get("window");
const isTablet = screenWidth >= 768;

const Stack = createStackNavigator<SabanaStackParamList>();

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
    </Stack.Navigator>
  );
};

export default SabanaNavigator;
