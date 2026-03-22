import { apiRequest } from "../../services/api/apiClient";
import { Construction } from "../../types/entities";
import { API_CONFIG } from "./config";
import { ConstructionCatalogResponse } from "src/types/construction";

interface Catalog {
  id: number;
  construction: number;
  name: string;
  creation_date: string;
  is_active: boolean;
  reason_of_change: string;
}

/**
 * Obtiene las obras asignadas al usuario actual
 */
export const getMyConstructions = async (
  role: string = "CONTRATISTA",
): Promise<Construction[]> => {
  try {
    console.log(
      "🔍 Requesting my constructions: /api/obra/constructions/my_constructions/?role=${role}",
    );

    const response = await apiRequest<Construction[]>(
      "get",
      `${API_CONFIG.endpoints.obra.constructions.myConstructions}?role=${role}`,
      "Error al obtener obras asignadas",
    );

    console.log("📦 My constructions response:", response);
    return response;
  } catch (error) {
    console.error("Error al obtener obras asignadas:", error);
    throw error;
  }
};

/**
 * Obtiene todas las obras asignadas al usuario con rol específico
 * @param role Rol del usuario (por defecto 'CONTRATISTA')
 */
export const getAssignedConstructions = async (
  role: string = "CONTRATISTA",
): Promise<Construction[]> => {
  try {
    const endpoint = `${API_CONFIG.endpoints.obra.constructions.myConstructions}?role=${role}`;
    console.log("🔍 Requesting assigned constructions:", endpoint);

    const response = await apiRequest<Construction[]>(
      "get",
      endpoint,
      "Error al obtener obras asignadas",
    );

    console.log("📦 Response from getAssignedConstructions:", {
      responseLength: response.length,
      constructions: response,
    });

    return response;
  } catch (error) {
    console.error("❌ Error al obtener obras asignadas:", error);
    throw error;
  }
};

/**
 * Obtiene todos los detalles de construcciones asignadas al usuario
 */
export const getUserConstructions = async (): Promise<Construction[]> => {
  try {
    console.log("🔍 Requesting all user constructions (no filters)");

    const response = await apiRequest<Construction[]>(
      "get",
      `${API_CONFIG.endpoints.obra.constructions.myConstructions}?role=CONTRATISTA`,
      "Error al obtener asignaciones de usuario",
    );

    console.log("📦 All user constructions response:", {
      responseLength: response.length,
      constructions: response,
    });

    return response;
  } catch (error) {
    console.error("❌ Error al obtener asignaciones de usuario:", error);
    throw error;
  }
};

/**
 * Obtiene los catálogos de una construcción específica
 * @param constructionId ID de la construcción
 */
export const getCatalogsByConstruction = async (
  constructionId: number,
): Promise<Catalog[]> => {
  try {
    const endpoint = `${API_CONFIG.endpoints.construction.catalog}?construction=${constructionId}`;

    const response = await apiRequest<ConstructionCatalogResponse>(
      "get",
      endpoint,
      "Error al obtener catálogos de la construcción",
    );

    return response.results;
  } catch (error) {
    console.error("❌ Error al obtener catálogos de la construcción:", error);

    throw error;
  }
};

export const getConstruction = async (
  constructionId?: number,
): Promise<Construction> => {
  if (!constructionId) {
    throw new Error(
      "Construction ID is required to fetch construction details",
    );
  }

  try {
    const endpoint = `${API_CONFIG.endpoints.obraConstructions}${constructionId}/`;
    console.log("🔍 Requesting construction details:", endpoint);

    const response = await apiRequest<Construction>(
      "get",
      endpoint,
      "Error al obtener detalles de la construcción",
    );

    console.log("📦 Construction details response:", response);
    return response;
  } catch (error) {
    console.error("❌ Error al obtener detalles de la construcción:", error);
    throw error;
  }
};
