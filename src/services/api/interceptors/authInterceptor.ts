import { AxiosInstance } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { store } from "../../../redux/store";
import { logout } from "../../../redux/slices/authSlice";

export const applyAuthInterceptors = (apiClient: AxiosInstance): void => {
  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      // Verificar si el error es 401 (Unauthorized)
      if (error.response && error.response.status === 401) {
        // Limpiar token y cerrar sesión
        await AsyncStorage.removeItem("token");
        store.dispatch(logout());
      }

      return Promise.reject(error);
    }
  );
};
