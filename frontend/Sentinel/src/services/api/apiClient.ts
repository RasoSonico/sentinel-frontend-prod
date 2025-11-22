import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { deleteToken, getTokenResponse } from "../../utils/auth";
import { API_CONFIG, isDevelopment } from "./config";
import { store } from "src/redux/store";
import { clearCredentials } from "src/redux/slices/authSlice";

// Interceptor to add token to requests - prioritizes SecureStore over AsyncStorage
const addTokenToRequestsInterceptor = (client: AxiosInstance) =>
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      if (isDevelopment) {
        console.log(`Making request to: ${config.baseURL}${config.url}`);
      }

      let token: string | null = null;

      try {
        // Priority 1: Try to get token from SecureStore (Azure AD)
        const tokenResponse = await getTokenResponse();
        if (tokenResponse?.accessToken) {
          token = tokenResponse.accessToken;
          console.log("Using token from SecureStore (Azure AD)");
        }
      } catch (error: unknown) {
        console.log("No token found in SecureStore, trying AsyncStorage...");
      }

      // Priority 2: Fallback to AsyncStorage (legacy auth)
      if (!token) {
        try {
          token = await AsyncStorage.getItem("token");
          if (token) {
            console.log("Using token from AsyncStorage (legacy)");
          }
        } catch (error: unknown) {
          console.error("Error getting token from AsyncStorage:", error);
        }
      }

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn("No authentication token found");
      }

      return config;
    },
    (error: unknown) => {
      console.error("Request interceptor error:", error);
      return Promise.reject(error);
    }
  );

// Interceptor to handle responses
const responseHandlerInterceptor = (client: AxiosInstance) =>
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      if (isDevelopment) {
        console.log(`Successful response from: ${response.config.url}`);
      }
      return response;
    },
    async (error: AxiosError) => {
      if (error.response) {
        console.error("Response error:", {
          status: error.response.status,
          data: error.response.data,
          url: error.config?.url,
        });

        // Handle 401 Unauthorized - clear tokens and redirect to login
        if (error.response.status === 401) {
          console.log("401 Unauthorized - clearing tokens");
          try {
            await deleteToken();
            store.dispatch(clearCredentials());
          } catch (clearError: unknown) {
            console.error("Error clearing tokens:", clearError);
          }
        }
      } else if (error.request) {
        console.error("Network error - No response:", {
          request: error.request._url || error.config?.url,
        });
      } else {
        console.error("Request configuration error:", error.message);
      }

      return Promise.reject(error);
    }
  );

const createClientWithInterceptors = (baseUrl: string) => {
  const client = axios.create({
    baseURL: baseUrl,
  });

  addTokenToRequestsInterceptor(client);
  responseHandlerInterceptor(client);

  return client;
};

const apiClient = createClientWithInterceptors(API_CONFIG.baseURL);

// Create a custom API error class
export class ApiError extends Error {
  status?: number;
  originalError: unknown;

  constructor(message: string, originalError: unknown, status?: number) {
    super(message);
    this.name = "ApiError";
    this.originalError = originalError;
    this.status = status;
  }
}

export const handleGlobalApiError = (
  error: unknown,
  defaultMessage: string
): never => {
  console.error(defaultMessage, error);

  // Get the appropriate error message
  let errorMessage = defaultMessage;
  let statusCode: number | undefined;

  if (error instanceof AxiosError) {
    statusCode = error.response?.status;

    // Try to extract API error message if available
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }
  }

  throw new ApiError(errorMessage, error, statusCode);
};

const makeApiRequest = async <T>(
  client: AxiosInstance,
  method: "get" | "post" | "put" | "patch" | "delete",
  url: string,
  data?: unknown,
  options?: {
    headers?: Record<string, any>;
    excludeAuth?: boolean;
  }
): Promise<T> => {
  if (isDevelopment) {
    console.log(`🔧 [API] Making ${method.toUpperCase()} request to: ${url}`);
    if (data) {
      console.log(`🔧 [API] With data:`, data);
    }
  }

  let response: AxiosResponse<T>;

  // Prepare config object for requests that need it
  const config: any = {
    headers: {
      ...(options?.headers || {}),
    },
  };

  // Handle auth exclusion
  if (options?.excludeAuth) {
    config.headers.Authorization = undefined;
  }

  // Handle different HTTP methods correctly
  switch (method) {
    case "get":
    case "delete":
      // GET and DELETE methods: url first, config second
      response = await client[method]<T>(url, config);
      break;
    case "post":
    case "put":
    case "patch":
      // POST, PUT, PATCH methods: url first, data second, config third
      response = await client[method]<T>(url, data, config);
      break;
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
  }

  return response.data;
};

export const apiRequest = async <T>(
  method: "get" | "post" | "put" | "patch" | "delete",
  url: string,
  errorMessage?: string,
  data?: unknown,
  options?: {
    headers?: Record<string, any>;
    raw?: boolean; // If true, returns the raw Axios response
  }
): Promise<T> => {
  try {
    return await makeApiRequest(apiClient, method, url, data, options);
  } catch (error: unknown) {
    const defaultErrorMsg = `Failed to ${method} data`;
    const errorMsg = errorMessage || defaultErrorMsg;

    handleGlobalApiError(error, errorMsg);

    // TypeScript needs this line to satisfy the return type,
    // but it will never be reached because handleGlobalApiError throws
    throw error;
  }
};

export const apiRequestWithBaseUrl = async <T>(
  method: "get" | "post" | "put" | "patch" | "delete",
  baseUrl: string,
  data?: unknown,
  options?: {
    headers?: Record<string, any>;
  }
): Promise<T> => {
  const customClient = createClientWithInterceptors(baseUrl);
  return makeApiRequest(customClient, method, "", data, options);
};

export default apiClient;
