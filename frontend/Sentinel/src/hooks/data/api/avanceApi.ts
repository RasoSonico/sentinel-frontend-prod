import { apiRequest } from "src/services/api/apiClient";
import { API_CONFIG } from "src/services/api/config";
import { CatalogoApiResponse } from "src/types/catalogo";
import { PartidaApiResponse } from "src/types/partida";
import { ConceptoApiResponse } from "src/types/concepto";
import { SubmitAdvance, SubmitAvanceResponse } from "src/types/avance";
import {
  PhysicalAdvanceResponse,
  Construction,
  AvanceBaseResponse,
} from "src/types/entities";

export const getAvanceBase = async () => {
  const endpoint = `${API_CONFIG.endpoints.advances.base}`;

  return await apiRequest<AvanceBaseResponse>(
    "get",
    endpoint,
    "Error al obtener bases del avance (partida, catalogo y concepto)",
  );
};

/**
 * Obtener catálogos asignados al usuario por construcción
 */
export const getCatalogsByConstruction = async (constructionId: number) => {
  const endpoint = `${API_CONFIG.endpoints.catalogs}?construction=${constructionId}`;

  return await apiRequest<CatalogoApiResponse>(
    "get",
    endpoint,
    "Error al obtener catálogos de la construcción",
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
    "Error al obtener partidas del catálogo",
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
    "Error al obtener conceptos de la partida",
  ).then((response) => {
    return response.results ?? [];
  });
};

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
  },
): Promise<PhysicalAdvanceResponse> => {
  const endpoint = `${API_CONFIG.endpoints.advances.list}${advanceId}/`;

  return await apiRequest<PhysicalAdvanceResponse>(
    "patch",
    endpoint,
    "Error al actualizar el avance",
    updates,
  );
};

export const submitAdvance = async (advance: SubmitAdvance) =>
  await apiRequest<SubmitAvanceResponse>(
    "post",
    API_CONFIG.endpoints.submitAdvance,
    "Hubo un error al enviar el formulario de avance, inténtelo de nuevo más tarde.",
    advance,
  );

/**
 * Obtener avances por catalog_id con filtros opcionales
 */
export const getAdvancesByCatalog = async ({
  catalogId,
  detailed = true,
}: {
  catalogId: number;
  detailed?: boolean;
}): Promise<{ advances: PhysicalAdvanceResponse[]; count: number }> => {
  const params = new URLSearchParams({
    catalog: catalogId.toString(),
  });

  // Agregar parámetro detailed si está habilitado
  if (detailed) {
    params.append("detailed", "true");
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
 * Obtener construcciones asignadas al usuario
 */
export const getAssignedConstructions = async (
  role: string = "CONTRATISTA",
): Promise<Construction[]> => {
  try {
    const endpoint = `${API_CONFIG.endpoints.obra.constructions.myConstructions}?role=${role}`;

    const response = await apiRequest<Construction[]>(
      "get",
      endpoint,
      "Error al obtener obras asignadas",
    );

    return response;
  } catch (error) {
    console.error("❌ Error al obtener obras asignadas:", error);
    throw error;
  }
};
