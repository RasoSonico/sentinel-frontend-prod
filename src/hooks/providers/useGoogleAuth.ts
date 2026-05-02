import { AuthProvider, AuthProviderConfig } from "src/types/auth";

export const useGoogleAuth = (
  _config: AuthProviderConfig,
  enabled: boolean = false
): AuthProvider => {
  const handleAuthResponse = () => {
    // Handle the authentication response
    return Promise.reject("Not implemented");
  };

  const login = async (): Promise<string | null> => {
    if (!enabled) {
      console.warn("Google's auth provider is not enabled");
      return null;
    }

    // Request authorization
    // Handle the response
    // Return the access token
    return null;
  };

  const logout = async (): Promise<void> => {
    if (!enabled) {
      console.warn("Google's auth provider is not enabled");
      return;
    }
    // Handle logout logic
    console.log("Logged out from Google auth provider");
  };

  return {
    login,
    handleAuthResponse,
    enabled,
    logout,
  };
};
