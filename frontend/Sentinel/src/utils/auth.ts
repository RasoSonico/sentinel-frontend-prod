import * as SecureStore from "expo-secure-store";
import { refreshAsync, TokenResponse } from "expo-auth-session";
import { store } from "src/redux/store";
import { clearCredentials } from "src/redux/slices/authSlice";
import { queryClient } from "src/providers/QueryProvider";
import authConfig from "src/config/authConfig.json";
import { AuthConfig } from "src/types/auth";

const STORAGE_KEY = "auth-token";

export async function saveTokenResponse(tokenResponse: TokenResponse) {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(tokenResponse));
}

export async function getTokenResponse(): Promise<TokenResponse | null> {
  const tokenResponseStr = await SecureStore.getItemAsync(STORAGE_KEY);

  if (!tokenResponseStr) return null;

  const tokenObject = JSON.parse(tokenResponseStr);
  return new TokenResponse(tokenObject);
}

export async function deleteToken() {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}

function _buildAzureDiscovery(): { tokenEndpoint: string } {
  const tenantId = (authConfig as AuthConfig).providers.azure.tenantId!;
  return {
    tokenEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
  };
}

async function _performRefresh(
  token: TokenResponse,
): Promise<TokenResponse | null> {
  if (!token.refreshToken) {
    console.log("[Auth] No refresh token available, cannot refresh.");
    return null;
  }
  const { clientId } = (authConfig as AuthConfig).providers.azure;
  const discovery = _buildAzureDiscovery();
  try {
    const refreshed = await refreshAsync(
      { clientId, refreshToken: token.refreshToken },
      discovery,
    );
    if (refreshed) {
      console.log("[Auth] Token refreshed successfully.");
      await saveTokenResponse(refreshed);
      return refreshed;
    }
  } catch (error) {
    console.error("[Auth] Token refresh failed:", error);
  }
  return null;
}

export async function maybeRefreshToken(): Promise<TokenResponse | null> {
  console.group("Auth Token Management");
  const token = await getTokenResponse();

  if (!token) {
    console.groupEnd();
    return null;
  }

  console.log(
    "Current token expires in:",
    Math.floor((token.expiresIn ?? 0) / 60),
    "minutes",
  );

  if (!token.shouldRefresh()) {
    console.log("Token is still valid, no refresh needed.");
    console.groupEnd();
    return token;
  }

  console.log("Token is expired, refreshing...");
  const refreshed = await _performRefresh(token);
  console.groupEnd();
  return refreshed;
}

let _refreshPromise: Promise<TokenResponse | null> | null = null;

export async function forceRefreshToken(): Promise<TokenResponse | null> {
  if (_refreshPromise) {
    console.log("[Auth] Refresh already in progress, waiting...");
    return _refreshPromise;
  }
  _refreshPromise = (async () => {
    try {
      console.log("[Auth] Force refresh token requested");
      const token = await getTokenResponse();
      if (!token) {
        console.log("[Auth] No token in store, cannot force refresh.");
        return null;
      }
      return await _performRefresh(token);
    } finally {
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
}

/**
 * Force logout the user from anywhere in the app.
 * This clears tokens, Redux state, and React Query cache.
 * Use this when receiving 401 Unauthorized responses.
 */
export async function forceLogout(): Promise<void> {
  console.log("[Auth] Force logout - clearing all auth state");

  try {
    // Clear token from SecureStore
    await deleteToken();

    // Clear Redux auth state
    store.dispatch(clearCredentials());

    // Invalidate auth-related queries
    queryClient.invalidateQueries({ queryKey: ["authMe"] });

    // Clear all query cache to prevent stale authenticated data
    queryClient.clear();
  } catch (error) {
    console.error("[Auth] Error during force logout:", error);
  }
}
