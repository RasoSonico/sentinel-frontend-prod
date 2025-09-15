import { apiRequest } from "src/services/api/apiClient";
import { API_CONFIG } from "src/services/api/config";
import { CatalogoApiResponse } from "src/types/catalogo";
import { PartidaApiResponse } from "src/types/partida";
import { ConceptoApiResponse } from "src/types/concepto";
import { SubmitAdvance, SubmitAvanceResponse } from "src/types/avance";
import { PhysicalAdvanceResponse, Construction } from "src/types/entities";

// DEPRECATED: Use getCatalogsByConstruction instead
export const getCatalogs = async () =>
  await apiRequest<CatalogoApiResponse>(
    "get",
    API_CONFIG.endpoints.catalogs,
    "Hubo un error al obtener los catálogos, inténtelo de nuevo más tarde."
  ).then((response) => {
    return response.results ?? [];
  });

// DEPRECATED: Use getPartidasByCatalog instead
export const getPartidas = async () =>
  await apiRequest<PartidaApiResponse>(
    "get",
    API_CONFIG.endpoints.partidas,
    "Hubo un error al obtener las partidas, inténtelo de nuevo más tarde."
  ).then((response) => {
    return response.results ?? [];
  });

// DEPRECATED: Use getConceptsByWorkItem instead
export const getConcepts = async () =>
  await apiRequest<ConceptoApiResponse>(
    "get",
    API_CONFIG.endpoints.concepts,
    "Hubo un error al obtener los conceptos, inténtelo de nuevo más tarde."
  ).then((response) => {
    return response.results ?? [];
  });

/**
 * NEW HIERARCHICAL APIs - Following correct user permissions flow for CONTRATISTA
 */

/**
 * Obtener catálogos asignados al usuario por construcción
 */
export const getCatalogsByConstruction = async (constructionId: number) => {
  const endpoint = `${API_CONFIG.endpoints.catalogs}?construction=${constructionId}`;

  return await apiRequest<CatalogoApiResponse>(
    "get",
    endpoint,
    "Error al obtener catálogos de la construcción"
  ).then((response) => {
    return response.results ?? [];
  });
};

/**
 * Obtener partidas (workitems) de un catálogo específico
 */
export const getPartidasByCatalog = async (catalogId: number) => {
  const endpoint = `${API_CONFIG.endpoints.partidas}?catalog=${catalogId}`;

  return await apiRequest<PartidaApiResponse>(
    "get",
    endpoint,
    "Error al obtener partidas del catálogo"
  ).then((response) => {
    return response.results ?? [];
  });
};

/**
 * Obtener conceptos de una partida específica
 */
export const getConceptsByWorkItem = async (workItemId: number) => {
  const endpoint = `${API_CONFIG.endpoints.concepts}?work_item=${workItemId}&page_size=100`;

  return await apiRequest<ConceptoApiResponse>(
    "get",
    endpoint,
    "Error al obtener conceptos de la partida"
  ).then((response) => {
    return response.results ?? [];
  });
};

// getConceptsByIds ya no es necesario con detailed=true
// La información viene directamente en los avances

/**
 * Actualizar un avance existente (edición)
 * Utiliza PATCH para actualización parcial de volume y/o comments
 */
export const updateAdvance = async (
  advanceId: number,
  updates: {
    volume?: string;
    comments?: string;
    status?: "PENDING" | "APPROVED" | "REJECTED";
  }
): Promise<PhysicalAdvanceResponse> => {
  const endpoint = `${API_CONFIG.endpoints.advances.list}${advanceId}/`;

  return await apiRequest<PhysicalAdvanceResponse>(
    "patch",
    endpoint,
    "Error al actualizar el avance",
    updates
  );
};

export const submitAdvance = async (advance: SubmitAdvance) =>
  await apiRequest<SubmitAvanceResponse>(
    "post",
    API_CONFIG.endpoints.submitAdvance,
    "Hubo un error al enviar el formulario de avance, inténtelo de nuevo más tarde.",
    advance
  );

// Nuevas funciones para AdvanceListScreen usando useQuery

/**
 * Obtener avances por catalog_id con filtros opcionales
 */
export const getAdvancesByCatalog = async ({
  catalogId,
  status,
  startDate,
  endDate,
  date,
  page = 1,
  pageSize = 20,
  detailed = true, // Nuevo parámetro para obtener información expandida
  ordering = "-date", // Nuevo parámetro para ordenamiento (por defecto: más recientes primero)
}: {
  catalogId: number;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  startDate?: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ (datetime)
  endDate?: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ (datetime)  
  date?: string; // YYYY-MM-DD (single date - DEPRECATED)
  page?: number;
  pageSize?: number;
  detailed?: boolean;
  ordering?: string;
}): Promise<{ advances: PhysicalAdvanceResponse[]; count: number }> => {
  const params = new URLSearchParams({
    catalog: catalogId.toString(),
    page: page.toString(),
    page_size: pageSize.toString(),
  });

  if (status) {
    params.append("status", status);
  }

  // Filtros de fecha
  if (startDate) {
    params.append("start_date", startDate);
  }

  if (endDate) {
    params.append("end_date", endDate);
  }

  if (date) {
    params.append("date", date);
  }

  // Agregar parámetro detailed si está habilitado
  if (detailed) {
    params.append("detailed", "true");
  }

  // Agregar parámetro ordering para definir el criterio de ordenamiento
  if (ordering) {
    params.append("ordering", ordering);
  }

  const endpoint = `${API_CONFIG.endpoints.advances.list}?${params.toString()}`;

  const response = await apiRequest<{
    results: PhysicalAdvanceResponse[];
    count: number;
    next: string | null;
    previous: string | null;
  }>("get", endpoint, "Error al obtener avances por catálogo");

  return {
    advances: response.results || [],
    count: response.count || 0,
  };
};

/**
 * Obtener construcción asignada al usuario
 */
export const getAssignedConstruction = async (
  role: string = "CONTRATISTA"
): Promise<Construction | null> => {
  try {
    const endpoint = `${API_CONFIG.endpoints.obra.constructions.myConstructions}?role=${role}`;

    const response = await apiRequest<Construction[]>(
      "get",
      endpoint,
      "Error al obtener obra asignada"
    );

    const result = response.length > 0 ? response[0] : null;
    return result;
  } catch (error) {
    console.error("❌ Error al obtener obra asignada:", error);
    throw error;
  }
};

// export const getCatalogs = async () => Promise.resolve(catalogsMockData.results ?? []);
//
// export const getPartidas = async () => Promise.resolve(partidaMockData.results ?? []);
//
// export const getConcepts = async () => Promise.resolve(conceptoMockData.results ?? []);
