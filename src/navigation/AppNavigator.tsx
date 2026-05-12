import React, { useState, useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AppTabParamList } from "./types";
import { AvanceNavigator } from "./moduleNavigators/AvanceNavigator";
import { IncidenciaNavigator } from "./moduleNavigators/IncidenciaNavigator";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet } from "react-native";
import PerfilScreen from "../modules/profiles/PerfilScreen";
import { ActivityIndicator } from "react-native-paper";
import { useAuthMeQuery } from "src/hooks/data/query/useAuthQueries";
import styles from "./styles/AppNavigator.styles";
import { getTabBarIconName } from "./utils/tabBarUtils";
import { UserRole } from "src/types/auth";
import ObrasListScreen from "src/modules/obra/screens/ObraListScreen";
import ServerErrorModal from "src/components/ServerErrorModal";
import { DesignTokens } from "../styles/designTokens";
import { usePendingAdvanceQueue } from "src/hooks/avance/usePendingAdvanceQueue";

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

// Custom icon component for Cola tab with badge
interface QueueTabIconProps {
  focused: boolean;
  size: number;
}

const QueueTabIcon: React.FC<QueueTabIconProps> = ({ focused, size }) => {
  const { pendingCount, failedCount, syncingCount } = usePendingAdvanceQueue();
  const totalCount = pendingCount + failedCount + syncingCount;

  // Determine icon color based on status
  const hasFailures = failedCount > 0;
  const hasPending = pendingCount > 0 || syncingCount > 0;

  let iconColor: string;
  let badgeColor: string;

  if (hasFailures) {
    iconColor = focused
      ? DesignTokens.colors.error[500]
      : DesignTokens.colors.error[400];
    badgeColor = DesignTokens.colors.error[500];
  } else if (hasPending) {
    iconColor = focused
      ? DesignTokens.colors.warning[500]
      : DesignTokens.colors.warning[400];
    badgeColor = DesignTokens.colors.warning[500];
  } else {
    iconColor = focused
      ? DesignTokens.colors.success[500]
      : DesignTokens.colors.neutral[400];
    badgeColor = DesignTokens.colors.success[500];
  }

  const iconName = focused ? "cloud-upload" : "cloud-upload-outline";

  return (
    <View style={tabIconStyles.container}>
      <Ionicons name={iconName} size={size} color={iconColor} />
      {totalCount > 0 && (
        <View style={[tabIconStyles.badge, { backgroundColor: badgeColor }]}>
          <Text style={tabIconStyles.badgeText}>
            {totalCount > 99 ? "99+" : totalCount}
          </Text>
        </View>
      )}
    </View>
  );
};

const tabIconStyles = StyleSheet.create({
  container: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});

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
          // Use custom icon for Cola tab
          if (route.name === "Cola") {
            return <QueueTabIcon focused={focused} size={size} />;
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
      {hasRole("CONTRATISTA") && (
        <>
          <Tab.Screen
            name="Avances"
            component={AvanceNavigator}
            options={{ tabBarLabel: "Inicio" }}
          />
          <Tab.Screen name="Incidencias" component={IncidenciaNavigator} />
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
