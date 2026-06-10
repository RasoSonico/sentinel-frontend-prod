import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  clearCredentials,
  setIsAuthenticated,
} from "src/redux/slices/authSlice";
import { getTokenResponse, maybeRefreshToken } from "src/utils/auth";
import { Surface, ActivityIndicator, Text, useTheme } from "react-native-paper";
import styles from "./AuthLoading.styles";

interface AuthLoadingProps {
  onAuthChecked: () => void;
}

const AuthLoading = ({ onAuthChecked }: AuthLoadingProps) => {
  const dispatch = useDispatch();
  const theme = useTheme();

  useEffect(() => {
    (async () => {
      console.group("<AuthLoading />");

      const token = await getTokenResponse();

      if (!token) {
        // No token in SecureStore at all — user must log in
        console.log("No token found — user must log in");
        dispatch(clearCredentials());
        onAuthChecked();
        console.groupEnd();
        return;
      }

      if (!token.shouldRefresh()) {
        // Token is still valid — no network call needed
        console.log("Token is valid, user is authenticated");
        dispatch(setIsAuthenticated(true));
        onAuthChecked();
        console.groupEnd();
        return;
      }

      // Token is expired — attempt a refresh
      console.log("Token is expired, attempting refresh...");
      const refreshResult = await maybeRefreshToken();

      if (refreshResult !== null && refreshResult !== "network_error") {
        // Refresh succeeded
        console.log("Token refreshed successfully, user is authenticated");
        dispatch(setIsAuthenticated(true));
      } else if (refreshResult === "network_error") {
        // Network unavailable right now, but the token still exists in SecureStore.
        // Keep the user authenticated — the 401 interceptor will handle a real
        // refresh once network is available.
        console.log(
          "Token refresh failed (network error) — keeping user authenticated, will retry on next API call",
        );
        dispatch(setIsAuthenticated(true));
      } else {
        // null = Azure explicitly rejected the tokens (invalid_grant, revoked, etc.)
        // The session is truly invalid — user must re-authenticate.
        console.log("Token confirmed invalid by Azure — user must log in");
        dispatch(clearCredentials());
      }

      onAuthChecked();
      console.groupEnd();
    })();
  }, [dispatch]);

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
