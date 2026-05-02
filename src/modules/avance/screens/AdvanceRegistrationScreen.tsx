import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  Alert,
  ActivityIndicator,
} from "react-native";
import { DesignTokens } from "../../../styles/designTokens";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";
import AdvanceForm from "../forms/AdvanceForm";
import { AvanceStackParamList } from "../../../navigation/types";
import { useAppDispatch } from "../../../redux/hooks";
import {
  setOnlineStatus,
  clearCurrentAdvance,
} from "../../../redux/slices/avance/advanceSlice";

type AdvanceRegistrationScreenRouteProp = RouteProp<
  AvanceStackParamList,
  "AvanceRegistration"
>;

type AdvanceRegistrationScreenNavigationProp = StackNavigationProp<
  AvanceStackParamList,
  "AvanceRegistration"
>;

const AdvanceRegistrationScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<AdvanceRegistrationScreenNavigationProp>();
  const route = useRoute<AdvanceRegistrationScreenRouteProp>();

  // Código para debuggear
  console.log("route:", route);
  console.log("route.params:", route.params);

  const constructionId =
    route.params?.constructionId || "default-construction-id";
  const constructionName = route.params?.constructionName || "Obra sin nombre";
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Configurar el título de la pantalla
  useEffect(() => {
    navigation.setOptions({
      title: "Registrar avance",
      headerTitleAlign: "center",
      headerRight: () => (
        <Ionicons
          name="help-circle-outline"
          size={24}
          color={DesignTokens.colors.primary[400]}
          style={{ marginRight: 16 }}
          onPress={showHelp}
        />
      ),
    });
  }, [navigation]);

  // Monitorear estado de conectividad
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected =
        state.isConnected !== false && state.isInternetReachable !== false;
      dispatch(setOnlineStatus(isConnected));
    });

    // Inicializar
    NetInfo.fetch().then((state) => {
      const isConnected =
        state.isConnected !== false && state.isInternetReachable !== false;
      dispatch(setOnlineStatus(isConnected));
      setIsLoading(false);
    });

    // Limpiar al desmontar
    return () => {
      unsubscribe();
      dispatch(clearCurrentAdvance());
    };
  }, [dispatch]);

  // Mostrar ayuda
  const showHelp = () => {
    Alert.alert(
      "Ayuda - Registro de avances",
      "Esta pantalla te permite registrar avances en conceptos de obra. " +
        "Para registrar un avance, sigue estos pasos:\n\n" +
        "1. Selecciona el catálogo y la partida que deseas reportar\n" +
        "2. Selecciona el concepto\n" +
        "3. Ingresa la cantidad ejecutada\n" +
        "4. Toma al menos una foto como evidencia\n" +
        "5. Añade comentarios si es necesario\n" +
        '6. Presiona "Registrar avance"\n\n' +
        "Si estás sin conexión, el avance se guardará localmente y se sincronizará automáticamente cuando recuperes la conexión.",
      [{ text: "Entendido", style: "default" }]
    );
  };

  // Manejar éxito al registrar avance
  const handleAdvanceSuccess = () => {
    // Podríamos navegar a otra pantalla o mostrar un mensaje
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={DesignTokens.colors.executive.primary}
        />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.constructionName}>{constructionName}</Text>
          <Text style={styles.headerDescription}>
            Registra los avances diarios para mantener actualizados los reportes
            de progreso.
          </Text>
        </View>

        <AdvanceForm
          constructionId={parseInt(constructionId)}
          onSuccess={handleAdvanceSuccess}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.colors.background.primary,
  },
  contentContainer: {
    flex: 1,
    padding: DesignTokens.spacing.lg,
  },
  headerContainer: {
    marginBottom: DesignTokens.spacing.xl,
  },
  constructionName: {
    fontSize: DesignTokens.typography.fontSize.xl,
    fontWeight: DesignTokens.typography.fontWeight.bold as any,
    marginBottom: DesignTokens.spacing.sm,
    color: DesignTokens.colors.neutral[900],
  },
  headerDescription: {
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.neutral[500],
    lineHeight:
      DesignTokens.typography.fontSize.sm *
      DesignTokens.typography.lineHeight.normal,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: DesignTokens.colors.background.primary,
  },
  loadingText: {
    marginTop: DesignTokens.spacing.lg,
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.neutral[500],
  },
});

export default AdvanceRegistrationScreen;
