import apiClient from "../../../services/api/apiClient";
import { User } from "src/types/auth";
import { API_CONFIG } from "src/services/api/config";
import { normalizeApiError } from "src/utils/apiError";

export const authMe = async (): Promise<User> => {
  try {
    const response = await apiClient.get<User>(API_CONFIG.endpoints.me);

    return response?.data;
  } catch (error) {
    console.log("authMe | Error fetching user data:", error);
    throw normalizeApiError(error);
  }
};
