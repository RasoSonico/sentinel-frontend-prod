import { apiRequest } from "src/services/api/apiClient";
import { API_CONFIG } from "src/services/api/config";
import { CatalogoApiResponse } from "src/types/catalogo";
import { PartidaApiResponse } from "src/types/partida";
import { ConceptoApiResponse } from "src/types/concepto";
import {
  SubmitAdvance,
  SubmitAvanceResponse,
  ConstructionSummaryResponse,
  ConstructionPhoto,
} from "src/types/avance";
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
    // Máximo permitido por la paginación del backend; sin esto solo llega la
    // primera página (15) y el historial/cache quedan truncados
    page_size: "100",
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
 * Agregado global de avance físico por obra (ADR-002 backend)
 */
export const getConstructionSummary = async (
  constructionId: number,
): Promise<ConstructionSummaryResponse> => {
  const endpoint = `${API_CONFIG.endpoints.advances.constructionSummary}${constructionId}/summary/`;

  return await apiRequest<ConstructionSummaryResponse>(
    "get",
    endpoint,
    "Error al obtener el resumen global de la obra",
  );
};

/**
 * Fotos de una obra en un rango de fechas (para la galería del día).
 * Nota: date_from/date_to truncan uploaded_at a fecha UTC en el servidor;
 * el llamador debe pedir un rango holgado y afinar del lado del cliente.
 */
export const getPhotosByRange = async ({
  constructionId,
  dateFrom,
  dateTo,
}: {
  constructionId: number;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
}): Promise<ConstructionPhoto[]> => {
  const params = new URLSearchParams({
    construction_id: constructionId.toString(),
    date_from: dateFrom,
    date_to: dateTo,
    upload_status: "COMPLETED",
    page_size: "100",
  });

  const endpoint = `${API_CONFIG.endpoints.photos.list}?${params.toString()}`;

  const response = await apiRequest<{
    results: ConstructionPhoto[];
    count: number;
  }>("get", endpoint, "Error al obtener las fotos de la obra");

  return response.results || [];
};

/**
 * Obtener construcción asignada al usuario
 */
export const getAssignedConstruction = async (
  role: string = "CONTRATISTA",
): Promise<Construction | null> => {
  try {
    const endpoint = `${API_CONFIG.endpoints.obra.constructions.myConstructions}?role=${role}`;

    const response = await apiRequest<Construction[]>(
      "get",
      endpoint,
      "Error al obtener obra asignada",
    );

    const result = response.length > 0 ? response[0] : null;
    return result;
  } catch (error) {
    console.error("❌ Error al obtener obra asignada:", error);
    throw error;
  }
};
