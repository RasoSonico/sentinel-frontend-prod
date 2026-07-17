export interface SubmitAvanceResponse {
  id: number,
  concept: number,
  volume: string,
  date: string,
  status: AvanceStatus,
  comments: string
}

export interface SubmitAdvance {
  concept: number,
  volume: number,
  comments: string,
  /**
   * Clave de idempotencia (UUID del item en la cola offline). El backend
   * responde el registro existente si se reintenta el mismo client_id.
   */
  client_id?: string
}

/** Respuesta de GET /api/avance/construction/<id>/summary/ (ADR-002 backend) */
export interface ConstructionSummaryResponse {
  construction_id: number;
  pct_fisico: number;
  importe_ejecutado: string;
  importe_contratado: string;
}

/** Item de GET /api/avance/photos/ (PhotoListSerializer, campos usados) */
export interface ConstructionPhoto {
  id: string;
  original_filename: string;
  thumbnail_url: string | null;
  physical_advance: number;
  uploaded_at: string;
  taken_at: string | null;
  upload_status: "PENDING" | "UPLOADING" | "COMPLETED" | "FAILED";
}

export enum AvanceStatus {
  "PENDING",
}
