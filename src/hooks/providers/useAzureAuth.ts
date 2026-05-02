import * as AuthSession from "expo-auth-session";
import { useDispatch } from "react-redux";
import { useCallback, useEffect } from "react";
import { AuthProvider, AuthProviderConfig } from "src/types/auth";

export const useAzureAuth = (
  config: AuthProviderConfig,
  enabled: boolean = false
): AuthProvider => {
  const dispatch = useDispatch();

  const tenantId = config.tenantId;
  const clientId = config.clientId;
  const discoveryUrl =
    enabled && tenantId
      ? `https://login.microsoftonline.com/${tenantId}/v2.0`
      : null;
  const discovery = AuthSession.useAutoDiscovery(discoveryUrl || "");

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: config.scheme,
    path: config.path,
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      scopes: config.scopes,
      redirectUri,
    },
    discovery
  );

  const handleAuthResponse = useCallback(
    async (
      response: AuthSession.AuthSessionResult
    ): Promise<AuthSession.TokenResponse | null> => {
      if (!enabled) return null;

      if (response.type === "success" && discovery) {
        const { code } = response.params;

        try {
          const tokenResponse = await AuthSession.exchangeCodeAsync(
            {
              clientId,
              code,
              extraParams: request?.codeVerifier
                ? { code_verifier: request.codeVerifier }
                : undefined,
              redirectUri,
            },
            discovery
          );

          // const accessToken = tokenResponse.accessToken;
          // dispatch(setToken(accessToken));
          return tokenResponse;
        } catch (error) {
          console.error("Error exchanging code for tokens:", error);
          return null;
        }
      }
      return null;
    },
    [enabled, discovery, dispatch, clientId, redirectUri, request?.codeVerifier]
  );

  useEffect(() => {
    if (enabled && response?.type === "success") {
      handleAuthResponse(response);
    }
  }, [response, enabled, handleAuthResponse]);

  const login = async (): Promise<AuthSession.TokenResponse | null> => {
    if (!enabled) {
      console.warn("Azure auth provider is not enabled");
      return null;
    }

    console.group("Azure Login");
    console.log("Starting Azure login process...");
    let result;

    if (request) {
      result = await promptAsync();
      if (result.type === "success") {
        console.log("Authentication successful");
        result = await handleAuthResponse(result);
      } else {
        console.error("Authentication failed or was canceled.");
        result = null;
      }
    } else {
      console.error("Authentication request is not ready yet.");
      result = null;
    }
    console.groupEnd();

    return result;
  };

  return {
    login,
    handleAuthResponse,
    enabled,
    discovery,
    clientId,
  };
};
