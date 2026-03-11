import { useDispatch, useSelector } from "react-redux";
import { useAuthMeQuery } from "./data/query/useAuthQueries";
import { useEffect } from "react";
import authConfig from "../config/authConfig.json";
import { useAzureAuth } from "./providers/useAzureAuth";
import { selectAuthInfo } from "src/redux/selectors/authSelectors";
import { setCredentials, setIsAuthenticated } from "src/redux/slices/authSlice";
import { AuthConfig, AuthProvider } from "src/types/auth";
import { saveTokenResponse, forceLogout } from "src/utils/auth";

export const useAuth = () => {
  const dispatch = useDispatch();
  const { token, role, user, isAuthenticated } = useSelector(selectAuthInfo);
  const {
    data: authUser,
    isSuccess: isAuthUserSuccessful,
    isPending: isAuthUserPending,
    isError: isAuthUserError,
    error: authUserError,
  } = useAuthMeQuery(isAuthenticated);

  const activeProvider = (authConfig as AuthConfig).activeProvider;
  const providers = (authConfig as AuthConfig).providers;

  const azureAuth = useAzureAuth(providers.azure, activeProvider === "azure");

  // Get the active provider based on configuration
  const getActiveProvider = (): AuthProvider => {
    switch (activeProvider) {
      case "azure":
        return azureAuth;
      default:
        console.debug(
          `[useAuth] Unsupported auth provider: ${activeProvider}, defaulting to Azure`,
        );
        return azureAuth; // Default to Azure
    }
  };

  const login = async () => {
    const provider = getActiveProvider();
    const tokenResponse = await provider.login();

    if (tokenResponse) {
      console.log("[useAuth] login() successful");
      saveTokenResponse(tokenResponse);
      dispatch(setIsAuthenticated(true));
    }
  };

  const logout = async () => {
    console.debug("[useAuth] Logging out user");
    await forceLogout();
  };

  useEffect(() => {
    if (isAuthUserSuccessful) {
      dispatch(
        setCredentials({
          user: authUser,
        }),
      );
    }

    if (
      isAuthUserError &&
      authUserError &&
      (authUserError as any).status === 401
    ) {
      console.warn("[useAuth] Unauthorized access, logging out");
      logout();
    }
  }, [
    isAuthUserSuccessful,
    isAuthUserError,
    authUserError,
    authUser,
    dispatch,
  ]);

  return {
    token,
    role,
    user,
    login,
    logout,
    isAuthUserPending,
    isAuthUserSuccessful,
    isAuthUserError,
    authUserError,
    activeProvider,
    discovery: getActiveProvider().discovery,
    clientId: getActiveProvider().clientId,
  };
};
