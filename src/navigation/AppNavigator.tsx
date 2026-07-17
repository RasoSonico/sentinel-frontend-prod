import React, { useState, useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AppTabParamList } from "./types";
import { SabanaNavigator } from "./moduleNavigators/SabanaNavigator";
import { ReportesNavigator } from "./moduleNavigators/ReportesNavigator";
import { MaquinariaNavigator } from "./moduleNavigators/MaquinariaNavigator";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { View, Text } from "react-native";
import PerfilScreen from "../modules/profiles/PerfilScreen";
import { ActivityIndicator } from "react-native-paper";
import { useAuthMeQuery } from "src/hooks/data/query/useAuthQueries";
import styles from "./styles/AppNavigator.styles";
import { getTabBarIconName } from "./utils/tabBarUtils";
import { UserRole } from "src/types/auth";
import ObrasListScreen from "src/modules/obra/screens/ObraListScreen";
import ServerErrorModal from "src/components/ServerErrorModal";
import { DesignTokens } from "../styles/designTokens";

// --- Skeletons for role-based screens ---
const AprobacionAvancesScreen = () => (
  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
    <Text>Aprobación de Avances (Inspector)</Text>
  </View>
);
const EstatusObrasScreen = () => (
  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
    <Text>Estatus de Distintas Obras (Inspector)</Text>
  </View>
);

const DashboardAvanceObraScreen = () => (
  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
    <Text>Dashboard de Avance de Obra (Desarrollador/Inversionista)</Text>
  </View>
);
const DashboardProblematicasScreen = () => (
  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
    <Text>Dashboard de Problemáticas (Desarrollador)</Text>
  </View>
);
const DashboardFinancieroScreen = () => (
  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
    <Text>Dashboard Financiero (Desarrollador)</Text>
  </View>
);
const EstatusFinancieroScreen = () => (
  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
    <Text>Estatus Financiero (Inversionista)</Text>
  </View>
);
// ----------------------------------------

const Tab = createBottomTabNavigator<AppTabParamList>();

export const AppNavigator = () => {
  const {
    data: authMeData,
    isLoading: isLoadingUserData,
    isError,
    error,
  } = useAuthMeQuery();
  const [serverErrorVisible, setServerErrorVisible] = useState(false);

  useEffect(() => {
    if (
      isError &&
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      (error as any).status === 500
    ) {
      setServerErrorVisible(true);
    }
  }, [isError, error]);

  if (serverErrorVisible) {
    return (
      <ServerErrorModal
        visible={true}
        onClose={() => setServerErrorVisible(false)}
      />
    );
  }

  if (isLoadingUserData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Cargando datos del usuario...</Text>
      </View>
    );
  }

  const hasRole = (role: UserRole) => authMeData?.roles?.includes(role);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === "Maquinaria") {
            return (
              <MaterialCommunityIcons
                name="excavator"
                size={size}
                color={color}
              />
            );
          }

          const iconName = getTabBarIconName(route.name, focused);
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: DesignTokens.colors.executive.primary,
        tabBarInactiveTintColor: DesignTokens.colors.neutral[400],
        tabBarHideOnKeyboard: true,
        headerShown: false,
      })}
    >
      {/* ADR-003 Fase 1: la sábana es el home; Reportes sube a tab de primer
          nivel; las tabs Avances e Incidencias desaparecen (sus pantallas
          viven en el stack de Sábana) */}
      {hasRole("CONTRATISTA") && (
        <>
          <Tab.Screen
            name="Home"
            component={SabanaNavigator}
            options={{ tabBarLabel: "Sábana" }}
          />
          <Tab.Screen
            name="Reportes"
            component={ReportesNavigator}
            options={{ tabBarLabel: "Reportes" }}
          />
          <Tab.Screen
            name="Maquinaria"
            component={MaquinariaNavigator}
            options={{ tabBarLabel: "Maquinaria" }}
          />
        </>
      )}

      {hasRole("INSPECTOR") && (
        <>
          <Tab.Screen name="Obras" component={ObrasListScreen} />
          <Tab.Screen name="Aprobacion" component={AprobacionAvancesScreen} />
          <Tab.Screen name="Estatus" component={EstatusObrasScreen} />
        </>
      )}

      {hasRole("DESARROLLADOR") && (
        <>
          <Tab.Screen name="Dashboard" component={DashboardAvanceObraScreen} />
          <Tab.Screen
            name="Problematicas"
            component={DashboardProblematicasScreen}
          />
          <Tab.Screen name="Financiero" component={DashboardFinancieroScreen} />
        </>
      )}

      {hasRole("INVERSIONISTA") && (
        <>
          <Tab.Screen name="Dashboard" component={DashboardAvanceObraScreen} />
          <Tab.Screen name="Financiero" component={EstatusFinancieroScreen} />
        </>
      )}

      <Tab.Screen name="Perfil" component={PerfilScreen} />
    </Tab.Navigator>
  );
};
