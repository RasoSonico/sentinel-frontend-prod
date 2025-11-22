import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useAuth } from "src/hooks/useAuth";
import {
  clearCredentials,
  setIsAuthenticated,
} from "src/redux/slices/authSlice";
import { maybeRefreshToken } from "src/utils/auth";
import { Surface, ActivityIndicator, Text, useTheme } from "react-native-paper";
import styles from "./AuthLoading.styles";

interface AuthLoadingProps {
  onAuthChecked: () => void;
}

const AuthLoading = ({ onAuthChecked }: AuthLoadingProps) => {
  const dispatch = useDispatch();
  const { discovery, clientId } = useAuth();
  const theme = useTheme();

  useEffect(() => {
    (async () => {
      const refreshed = await maybeRefreshToken(discovery, clientId);

      console.group("<AuthLoading />");
      if (refreshed) {
        console.log("Token is present and valid, user is authenticated");
        dispatch(setIsAuthenticated(true));
      } else {
        console.log("Token was not refreshed, clearing credentials");
        dispatch(clearCredentials());
      }
      onAuthChecked();
      console.groupEnd();
    })();
  }, [dispatch, discovery, clientId]);

  return (
    <Surface style={styles.surface}>
      <ActivityIndicator
        animating
        size={48}
        color={theme.colors.primary}
        style={styles.indicator}
      />
      <Text variant="titleLarge" style={styles.title}>
        Verificando tus credenciales…
      </Text>
      <Text variant="bodyMedium" style={styles.paragraph}>
        Por favor espera mientras verificamos tu sesión. Esto asegura que tu
        cuenta esté segura y actualizada.
      </Text>
    </Surface>
  );
};

export default AuthLoading;
