import { apiRequest } from "src/services/api/apiClient";
import { API_CONFIG } from "src/services/api/config";
import { ConceptoItem } from "src/types/concepto";
import {
  TipoMaquinaria,
  MaquinariaItem,
  AltaMaquinariaResponse,
  CreateMaquinariaBody,
  EstanciaResponse,
  CreateEstanciaBody,
  CloseEstanciaBody,
  JornadaResponse,
  CreateJornadaBody,
  CreateReconciliacionBody,
  ReconciliacionResponse,
  HubDiarioResponse,
} from "src/types/maquinaria";

export const getHubDiario = async (
  constructionId: number,
  fecha?: string,
): Promise<HubDiarioResponse> => {
  const params = new URLSearchParams({
    construction_id: constructionId.toString(),
  });
  if (fecha) params.append("fecha", fecha);
  const endpoint = `${API_CONFIG.endpoints.maquinaria.hub}?${params.toString()}`;
  return apiRequest<HubDiarioResponse>(
    "get",
    endpoint,
    "Error al obtener hub de maquinaria",
  );
};

export const getTiposMaquinaria = async (): Promise<TipoMaquinaria[]> => {
  const endpoint = `${API_CONFIG.endpoints.maquinaria.tipos}?page_size=100`;
  const response = await apiRequest<{
    count: number;
    results: TipoMaquinaria[];
  }>("get", endpoint, "Error al obtener tipos de maquinaria");
  return response.results ?? [];
};

export const getMaquinariasByConstruction = async (
  constructionId: number,
): Promise<MaquinariaItem[]> => {
  const endpoint = `${API_CONFIG.endpoints.maquinaria.maquinarias}?construction_id=${constructionId}&page_size=100`;
  const response = await apiRequest<{
    count: number;
    results: MaquinariaItem[];
  }>("get", endpoint, "Error al obtener maquinaria de la obra");
  return response.results ?? [];
};

export const createMaquinaria = async (
  body: CreateMaquinariaBody,
): Promise<AltaMaquinariaResponse> =>
  apiRequest<AltaMaquinariaResponse>(
    "post",
    API_CONFIG.endpoints.maquinaria.maquinarias,
    "Error al registrar la maquinaria",
    body,
  );

export const createEstancia = async (
  body: CreateEstanciaBody,
): Promise<EstanciaResponse> =>
  apiRequest<EstanciaResponse>(
    "post",
    API_CONFIG.endpoints.maquinaria.estancias,
    "Error al reactivar la maquinaria",
    body,
  );

export const closeEstancia = async (
  estanciaId: number,
  body: CloseEstanciaBody,
): Promise<Partial<EstanciaResponse>> =>
  apiRequest<Partial<EstanciaResponse>>(
    "patch",
    `${API_CONFIG.endpoints.maquinaria.estancias}${estanciaId}/`,
    "Error al registrar salida de maquinaria",
    body,
  );

export const createJornada = async (
  body: CreateJornadaBody,
): Promise<JornadaResponse> =>
  apiRequest<JornadaResponse>(
    "post",
    API_CONFIG.endpoints.maquinaria.jornadas,
    "Error al registrar la jornada",
    body,
  );

export const createReconciliacion = async (
  body: CreateReconciliacionBody,
): Promise<ReconciliacionResponse> =>
  apiRequest<ReconciliacionResponse>(
    "post",
    API_CONFIG.endpoints.maquinaria.reconciliaciones,
    "Error al resolver la reconciliación",
    body,
  );

export const getConceptsByCatalog = async (
  catalogId: number,
): Promise<ConceptoItem[]> => {
  const endpoint = `${API_CONFIG.endpoints.concepts}?catalog=${catalogId}&page_size=200`;
  const response = await apiRequest<{ count: number; results: ConceptoItem[] }>(
    "get",
    endpoint,
    "Error al obtener conceptos del catálogo",
  );
  return response.results ?? [];
};
