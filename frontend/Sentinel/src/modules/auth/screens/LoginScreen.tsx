import React, { useEffect, useState } from "react";
import styles from "./LoginScreen.styles";
import {
  View,
  Text,
  Image,
  SafeAreaView,
  Platform,
  Alert,
  Modal,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DesignTokens } from "../../../styles/designTokens";
import { Button } from "../../../components/ui/Button";
import { useAppSelector, useAppDispatch } from "../../../redux/hooks";
import { selectError } from "../../../redux/selectors/authSelectors";
import { setError } from "../../../redux/slices/authSlice";
import * as Device from "expo-device";
import { useAuth } from "../../../hooks/useAuth";
import ServerErrorModal from "src/components/ServerErrorModal";

const LoginScreen: React.FC = () => {
  const { login, isAuthUserError, isAuthUserPending, authUserError } =
    useAuth();
  const dispatch = useAppDispatch();
  const error = useAppSelector(selectError);
  const [serverErrorVisible, setServerErrorVisible] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Use dedicated login loading state
  const isLoading = isLoggingIn;

  useEffect(() => {
    if (
      isAuthUserError &&
      typeof authUserError === "object" &&
      authUserError !== null &&
      "status" in authUserError &&
      (authUserError as any).status === 500
    ) {
      setServerErrorVisible(true);
    }
  }, [isAuthUserError, authUserError]);

  useEffect(() => {
    if (error) {
      Alert.alert("Error de Autenticación", error);
      dispatch(setError(null));
    }
  }, [error, dispatch]);

  const handleLogin = async () => {
    if (isLoading) return;

    setIsLoggingIn(true);
    console.log("Starting login process...");

    try {
      await login();
      console.log("Login completed successfully");
    } catch (err) {
      console.error("Login error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido";

      Alert.alert(
        "Error de Autenticación",
        `Ocurrió un error durante el inicio de sesión: ${errorMessage}`,
      );

      dispatch(setError(errorMessage));
    } finally {
      setIsLoggingIn(false);
      console.log("Login process finished");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ServerErrorModal
        visible={serverErrorVisible}
        onClose={() => setServerErrorVisible(false)}
      />

      {/* ELEMENTOS DECORATIVOS DE FONDO */}
      <View style={styles.backgroundDecoration}>
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        <View style={styles.decorativeCircle3} />
      </View>

      <View style={styles.content}>
        {/* SECCIÓN DEL LOGO CON DISEÑO MODERNO */}
        <View style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <Image
              source={require("../../../assets/SENTINEL_LOGO.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          {/* <Text style={styles.title}>SENTINEL</Text>
          <Text style={styles.subtitle}>
            Control y Transparencia en Construcción
          </Text> */}
        </View>

        {/* FORMULARIO CON TARJETA MODERNA */}
        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <Text style={styles.welcomeText}>Bienvenido</Text>
            <Text style={styles.instructionText}>
              Inicia sesión con tu cuenta de Microsoft para acceder
            </Text>
          </View>

          {/* BOTÓN MICROSOFT REESTRUCTURADO */}
          <TouchableOpacity
            style={styles.microsoftButton}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <View style={styles.microsoftButtonContent}>
              <View style={styles.microsoftButtonIcon}>
                <Ionicons name="logo-microsoft" size={20} color="#0078d4" />
              </View>
              <Text
                style={styles.microsoftButtonText}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {isLoading ? "Conectando..." : "Iniciar con Microsoft"}
              </Text>
            </View>
            {isLoading && (
              <ActivityIndicator
                color="#FFFFFF"
                style={{ marginLeft: 12 }}
                size="small"
              />
            )}
          </TouchableOpacity>

          {Platform.OS === "ios" && Device.isDevice && (
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                🔒 Se abrirá Microsoft de forma segura y luego volverás
                automáticamente
              </Text>
            </View>
          )}
        </View>

        {/* FOOTER CON BADGE DE SEGURIDAD */}
        <View style={styles.footerContainer}>
          <View style={styles.securityBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#d69e2e" />
            <Text style={styles.securityText}>Conexión Segura</Text>
          </View>
          <Text style={styles.footer}>
            © {new Date().getFullYear()} SENTINEL • Todos los derechos
            reservados
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;
