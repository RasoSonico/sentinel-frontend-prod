// Usuario
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
}

// Obra
export interface Construction {
  id: string;
  name: string;
  description: string;
  location: string;
  country?: string;
  state?: string;
  client?: string;
  budget: string; // Cambiado a string para coincidir con la API
  creation_date?: string;
  start_date: string;
  end_date: string;
  status: "PLANNING" | "IN_PROGRESS" | "COMPLETED" | "SUSPENDED" | "Pending";
  created_at?: string;
  updated_at?: string;
}

// Catálogo
export interface Catalog {
  id: string;
  name: string;
  description: string;
  construction: string;
  created_at: string;
  updated_at: string;
}

// Partida
export interface WorkItem {
  id: string;
  name: string;
  description: string;
  catalog: string;
  created_at: string;
  updated_at: string;
}

// Concepto
export interface Concept {
  id: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  work_item: string;
  created_at: string;
  updated_at: string;
}

// Cronograma
export interface Schedule {
  id: string;
  name: string;
  description: string;
  construction: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Actividad
export interface Activity {
  id: string;
  name: string;
  description: string;
  schedule: string;
  start_date: string;
  end_date: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

// Avance Físico
export interface Physical {
  id: string;
  concept: string;
  date: string;
  quantity: number;
  progress_percentage: number;
  notes: string;
  photos: string[];
  created_at: string;
  updated_at: string;
}

// Estimación
export interface Estimation {
  id: string;
  construction: string;
  number: number;
  date: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  total_amount: number;
  created_at: string;
  updated_at: string;
}

// Detalle de Estimación
export interface EstimationDetail {
  id: string;
  estimation: string;
  concept: string;
  quantity: number;
  unit_price: number;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface AdvanceRegistration {
  construction_id: string;
  concept_id: string;
  quantity: number;
  is_completed: boolean;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

export interface AdvancePhoto {
  id: string;
  url: string;
  thumbnail_url: string;
  created_at: string;
}

export interface PhysicalAdvance {
  id: string;
  construction_id: string;
  construction_name: string;
  concept_id: string;
  concept_code: string;
  concept_name: string;
  concept_unit: string;
  quantity: number;
  is_completed: boolean;
  notes: string;
  latitude: number | null;
  longitude: number | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approval_date: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  created_by_name: string;
  approved_by: string | null;
  approved_by_name: string | null;
  photos: AdvancePhoto[];
  program_status: "on_schedule" | "ahead" | "delayed";
}

export interface PhysicalAdvanceSummary {
  construction_id: string;
  total_advances: number;
  pending_advances: number;
  approved_advances: number;
  rejected_advances: number;
  total_concepts: number;
  completed_concepts: number;
  physical_progress_percentage: number;
  financial_progress_percentage: number;
  last_advance_date: string | null;
}

// Nueva interfaz que coincide con la respuesta real de la API
export interface PhysicalAdvanceResponse {
  id: number;
  concept: number; // Mantenido para compatibilidad
  volume: string;
  date: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  comments: string | null;
  // Nuevos campos del modo detailed=true
  concept_id?: number;
  concept_description?: string;
  concept_unit?: string;
  concept_quantity?: string;
  concept_unit_price?: string;
  concept_classification?: string;
  concept_wbs_code?: string | null;
  concept_section_name?: string | null;
  work_item_id?: number;
  work_item_name?: string;
  catalog_id?: number;
  catalog_name?: string;
  construction_id?: number;
  construction_name?: string;
  total_amount?: string;
  // Evidencia fotográfica (ADR-002 backend; opcionales para backend viejo)
  photo_count?: number;
  photos?: AdvancePhoto[];
}

// Tipos adicionales para la entidad UserConstruction
export interface UserRole {
  id: string;
  name: string;
  description: string;
}

export interface UserDetails {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  outter_id: string | null;
  roles: string[];
  is_active: boolean;
}

export interface UserConstruction {
  id: string;
  user: string;
  construction: string;
  role: string;
  is_active: boolean;
  asignation_date: string;
  user_details: UserDetails;
  role_details: UserRole;
  construction_details: Construction;
}

// Avance Base Section
export interface AvanceBaseSection {
  id: number;
  name: string;
  level: number;
  parent_id: number | null;
  work_item_id: number;
}

// Avance Base Concept
export interface AvanceBaseConcept {
  id: number;
  description: string;
  unit: string;
  quantity: string;
  price: string;
  clasification: string;
  cumulative_volume: string;
  quantity_left: string;
  section_id: number | null;
  wbs_code: string | null;
}

// Avance Base Work Item
export interface AvanceBaseWorkItem {
  id: number;
  name: string;
  sections: AvanceBaseSection[];
  concepts: AvanceBaseConcept[];
}

// Avance Base Catalog
export interface AvanceBaseCatalog {
  id: number;
  name: string;
  construction_id: number;
  construction_name: string;
  work_items: AvanceBaseWorkItem[];
}

// Avance Base Meta
export interface AvanceBaseMeta {
  total_catalogs: number;
  total_work_items: number;
  total_concepts: number;
  user_constructions: number[];
  filters_applied: {
    construction_id: number | null;
    active_only: boolean;
  };
  generated_at: string;
}

// Avance Base Response
export interface AvanceBaseResponse {
  catalogs: AvanceBaseCatalog[];
  meta: AvanceBaseMeta;
}
