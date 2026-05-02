// src/modules/auth/screens/SimpleLoginScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAppDispatch } from "../../../redux/hooks";
import { setCredentials } from "../../../redux/slices/authSlice";

const SimpleLoginScreen = () => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);

  const handleSimpleLogin = async () => {
    try {
      setLoading(true);

      // Simular un proceso de autenticación simple
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Crear datos de prueba para autenticación
      dispatch(
        setCredentials({
          user: {
            id: "test-user",
            email: "test@example.com",
            name: "Usuario de Prueba",
            roles: ["CONTRATISTA"],
          },
        }),
      );

      console.log("Login simulado exitoso");
    } catch (error) {
      console.error("Error en login:", error);
      Alert.alert("Error", "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SENTINEL</Text>
      <Text style={styles.subtitle}>Control y Transparencia</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleSimpleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Iniciar Sesión (Prueba)</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#0366d6",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    color: "#666",
  },
  button: {
    backgroundColor: "#0366d6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default SimpleLoginScreen;
