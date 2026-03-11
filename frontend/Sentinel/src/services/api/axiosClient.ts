import { API_URL } from "@env";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { InternalAxiosRequestConfig } from "axios";

// URL base de la API
export const isDevelopment = process.env.NODE_ENV === "development";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para añadir token a las peticiones
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Interceptor para manejar errores de autenticación
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Si el error es 401 (Unauthorized), podríamos redireccionar al login
    // o refrescar el token, pero no usaremos el store directamente aquí
    if (error.response && error.response.status === 401) {
      // En lugar de usar el store, guardamos un flag en AsyncStorage
      await AsyncStorage.setItem("auth_error", "true");

      // Podríamos disparar un evento que otros componentes puedan escuchar
      const event = new Event("auth_error");
      document.dispatchEvent(event);
    }

    return Promise.reject(error);
  },
);

export default apiClient;
