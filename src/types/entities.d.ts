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

// Una de las últimas cargas del concepto (trazabilidad de la ficha L-02).
// Viaja en el paquete offline porque la lista de avances se pagina a 100 y las
// cargas de un concepto concreto podían quedar fuera del corte.
export interface UltimaCarga {
  fecha: string;
  volumen: string;
  tiene_foto: boolean;
}

// ── Programa contractual (ADR-003 §8.1) ──────────────────────────────────────
// Todos los decimales llegan como string y se convierten con parseNum.

export interface ProgramaCorteApi {
  fecha_corte: string;
  volumen_acumulado: string;
}

export interface ProgramaConceptoApi {
  // XOR: uno de los dos, nunca ambos. El indicador se pinta solo en el nivel
  // donde el programa existe; la app jamás prorratea hacia abajo (D4).
  concept_id: number | null;
  work_item_id: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  volumen_total: string;
  cortes: ProgramaCorteApi[];
}

export interface ProgramaApi {
  version_id: number;
  numero_version: number;
  fecha_carga: string;
  conceptos: ProgramaConceptoApi[];
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
  // Opcional para tolerar backend viejo — misma disciplina que la enmienda E1
  // de Fase 1. Sin el campo, la ficha simplemente no muestra trazabilidad.
  ultimas_cargas?: UltimaCarga[];
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
  // `null` cuando el catálogo no tiene versión vigente — el backend nunca omite
  // la clave. Opcional además para tolerar backend viejo. D11: sin dato de
  // programa el elemento no se renderiza; jamás un 0 fabricado.
  programa?: ProgramaApi | null;
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
