// Tipos base para incidencias

export interface IncidentType {
  id: number;
  name: string;
  description: string;
}

export interface IncidentClassification {
  id: number;
  name: string;
  description: string;
}

export interface Incident {
  id: number;
  type: number;
  type_detail: IncidentType;
  clasification: number;
  clasification_detail: IncidentClassification;
  construction: number;
  user: number;
  date: string;
  description: string;
}

// Tipos para crear incidencia
export interface CreateIncident {
  type: number;
  clasification: number;
  description: string;
}

// Tipos para actualizar incidencia
export interface UpdateIncident {
  type?: number;
  clasification?: number;
  description?: string;
}

// Respuesta de la API para listado de incidencias
export interface IncidentApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Incident[];
}

// Respuesta de la API para tipos de incidencia
export interface IncidentTypeApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: IncidentType[];
}

// Respuesta de la API para clasificaciones de incidencia
export interface IncidentClassificationApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: IncidentClassification[];
}

// Tipos para filtros de búsqueda
export interface IncidentFilters {
  type?: number;
  clasification?: number;
  construction?: number;
  date_after?: string;
  date_before?: string;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

// Tipos para estado de formulario
export interface IncidentFormData {
  type: number | null;
  clasification: number | null;
  description: string;
  isValid: boolean;
  errors: {
    type?: string;
    clasification?: string;
    description?: string;
  };
}

// Tipos para resumen/estadísticas (si se necesitan)
export interface IncidentSummary {
  total_incidents: number;
  by_type: Record<string, number>;
  by_classification: Record<string, number>;
  by_status: Record<string, number>;
  recent_incidents: Incident[];
}