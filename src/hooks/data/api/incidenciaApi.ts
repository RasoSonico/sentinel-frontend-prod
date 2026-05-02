import { apiRequest } from "src/services/api/apiClient";
import { API_CONFIG } from "src/services/api/config";
import {
  IncidentApiResponse,
  IncidentTypeApiResponse,
  IncidentClassificationApiResponse,
  Incident,
  IncidentType,
  IncidentClassification,
  CreateIncident,
  UpdateIncident,
  IncidentFilters,
} from "src/types/incidencia";

/**
 * APIs para obtener catálogos de incidencias
 */

/**
 * Obtener todos los tipos de incidencia
 */
export const getIncidentTypes = async (pageSize: number = 100): Promise<IncidentType[]> => {
  const endpoint = `${API_CONFIG.endpoints.incidencias.incidentTypes}?page_size=${pageSize}`;
  
  return await apiRequest<IncidentTypeApiResponse>(
    "get",
    endpoint,
    "Error al obtener tipos de incidencia"
  ).then((response) => {
    return response.results ?? [];
  });
};

/**
 * Obtener todas las clasificaciones de incidencia
 */
export const getIncidentClassifications = async (pageSize: number = 100): Promise<IncidentClassification[]> => {
  const endpoint = `${API_CONFIG.endpoints.incidencias.incidentClassifications}?page_size=${pageSize}`;
  
  return await apiRequest<IncidentClassificationApiResponse>(
    "get",
    endpoint,
    "Error al obtener clasificaciones de incidencia"
  ).then((response) => {
    return response.results ?? [];
  });
};

/**
 * APIs principales de incidencias
 */

/**
 * Obtener incidencias con filtros y paginación
 */
export const getIncidents = async (filters: IncidentFilters = {}): Promise<{
  incidents: Incident[];
  count: number;
  next: string | null;
  previous: string | null;
}> => {
  const params = new URLSearchParams();
  
  // Agregar filtros a los parámetros
  if (filters.type) params.append("type", filters.type.toString());
  if (filters.clasification) params.append("clasification", filters.clasification.toString());
  if (filters.construction) params.append("construction", filters.construction.toString());
  if (filters.date_after) params.append("date_after", filters.date_after);
  if (filters.date_before) params.append("date_before", filters.date_before);
  if (filters.search) params.append("search", filters.search);
  if (filters.ordering) params.append("ordering", filters.ordering);
  
  // Paginación
  params.append("page", (filters.page || 1).toString());
  params.append("page_size", (filters.page_size || 15).toString());

  const endpoint = `${API_CONFIG.endpoints.incidencias.incidents}?${params.toString()}`;

  const response = await apiRequest<IncidentApiResponse>(
    "get",
    endpoint,
    "Error al obtener incidencias"
  );

  return {
    incidents: response.results || [],
    count: response.count || 0,
    next: response.next,
    previous: response.previous,
  };
};

/**
 * Obtener una incidencia específica por ID
 */
export const getIncidentById = async (incidentId: number): Promise<Incident> => {
  const endpoint = `${API_CONFIG.endpoints.incidencias.incidents}${incidentId}/`;
  
  return await apiRequest<Incident>(
    "get",
    endpoint,
    "Error al obtener detalles de la incidencia"
  );
};

/**
 * Crear una nueva incidencia
 */
export const createIncident = async (incident: CreateIncident): Promise<Incident> => {
  return await apiRequest<Incident>(
    "post",
    API_CONFIG.endpoints.incidencias.incidents,
    "Error al crear la incidencia",
    incident
  );
};

/**
 * Actualizar una incidencia existente (PUT - actualización completa)
 */
export const updateIncident = async (
  incidentId: number,
  incident: CreateIncident
): Promise<Incident> => {
  const endpoint = `${API_CONFIG.endpoints.incidencias.incidents}${incidentId}/`;
  
  return await apiRequest<Incident>(
    "put",
    endpoint,
    "Error al actualizar la incidencia",
    incident
  );
};

/**
 * Actualizar parcialmente una incidencia (PATCH - actualización parcial)
 */
export const patchIncident = async (
  incidentId: number,
  updates: UpdateIncident
): Promise<Incident> => {
  const endpoint = `${API_CONFIG.endpoints.incidencias.incidents}${incidentId}/`;
  
  return await apiRequest<Incident>(
    "patch",
    endpoint,
    "Error al actualizar la incidencia",
    updates
  );
};

/**
 * Eliminar una incidencia
 */
export const deleteIncident = async (incidentId: number): Promise<void> => {
  const endpoint = `${API_CONFIG.endpoints.incidencias.incidents}${incidentId}/`;
  
  return await apiRequest<void>(
    "delete",
    endpoint,
    "Error al eliminar la incidencia"
  );
};

/**
 * APIs para administración de catálogos (solo para staff/admin)
 */

/**
 * Crear un nuevo tipo de incidencia
 */
export const createIncidentType = async (type: Omit<IncidentType, "id">): Promise<IncidentType> => {
  return await apiRequest<IncidentType>(
    "post",
    API_CONFIG.endpoints.incidencias.incidentTypes,
    "Error al crear tipo de incidencia",
    type
  );
};

/**
 * Crear una nueva clasificación de incidencia
 */
export const createIncidentClassification = async (
  classification: Omit<IncidentClassification, "id">
): Promise<IncidentClassification> => {
  return await apiRequest<IncidentClassification>(
    "post",
    API_CONFIG.endpoints.incidencias.incidentClassifications,
    "Error al crear clasificación de incidencia",
    classification
  );
};