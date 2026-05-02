import axiosClient from "../api/axiosClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../../types/entities";

interface LoginResponse {
  token: string;
  user: User;
}

class AuthService {
  // Iniciar sesión
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await axiosClient.post<LoginResponse>(
        "usuarios/login/",
        {
          email,
          password,
        },
      );

      // Guardar token en AsyncStorage
      await AsyncStorage.setItem("token", response.data.token);

      return response.data;
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      throw error;
    }
  }

  // Cerrar sesión
  async logout(): Promise<void> {
    try {
      // Eliminar token del AsyncStorage
      await AsyncStorage.removeItem("token");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      throw error;
    }
  }

  // Verificar si hay token guardado
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem("token");
      return !!token;
    } catch (error) {
      console.error("Error al verificar autenticación:", error);
      return false;
    }
  }

  // Obtener información del usuario actual
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await axiosClient.get<User>("usuarios/me/");
      return response.data;
    } catch (error) {
      console.error("Error al obtener usuario actual:", error);
      return null;
    }
  }
}

export default new AuthService();
