import * as SecureStore from "expo-secure-store";
import { refreshAsync, TokenResponse } from "expo-auth-session";

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

export async function maybeRefreshToken(
  discovery: any,
  clientId: string,
): Promise<TokenResponse | null> {
  console.group("Auth Token Management");
  const token = await getTokenResponse();

  if (!token) return null;

  console.log(
    "Current token expires in: ",
    Math.floor(token?.expiresIn! / 60),
    "minutes",
  );

  if (!token.shouldRefresh()) {
    console.log("Token is still valid, no refresh needed.");
    console.groupEnd();
    return token;
  }

  console.log("Token is expired, refreshing...");
  const refreshed = await refreshAsync(
    {
      clientId,
      refreshToken: token.refreshToken!,
    },
    discovery,
  );

  if (refreshed) {
    console.log("Token refreshed successfully.");
    await saveTokenResponse(refreshed);

    console.groupEnd();
    return refreshed;
  }

  console.log("Token refresh failed.");
  console.groupEnd();
  return null;
}
