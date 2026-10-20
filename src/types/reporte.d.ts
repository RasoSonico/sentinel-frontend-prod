/**
 * Contratos del reporte de actividades diario (UIN-TOP-F-002).
 *
 * Espejo de lo que sirve `reportes/serializers.py` en el backend (ADR-004).
 * Los nombres de campo se conservan en snake_case tal como llegan: renombrarlos
 * en el borde obligaría a mantener un mapeo que se desincroniza en silencio la
 * primera vez que el backend agregue un campo.
 */

import type { AreaReporte } from "src/modules/reportes/constantes";

export type TipoProveedor = "CONTRATISTA" | "SUPERVISION";

export interface Proveedor {
  id: number;
  nombre: string;
  tipo: TipoProveedor;
}

// ── Escritura ──────────────────────────────────────────────────────────────

export interface ActividadPayload {
  orden: number;
  texto: string;
}

export interface FotoPayload {
  orden: number;
  pie: string;
  filename: string;
  content_type?: string;
  taken_at?: string | null;
  device_model?: string | null;
}

export interface ReportePayload {
  /**
   * `proveedor_ids` lleva contratistas Y supervisión en una sola lista: es lo
   * que el usuario palomeó en P-00. El servidor los clasifica por el `tipo`
   * del catálogo, que es el único lugar donde ese dato es autoridad.
   */
  /** UUID acuñado al ENCOLAR. Es la clave de idempotencia del POST. */
  client_id: string;
  construction: number;
  /** Especialidad que reporta. Se imprime en sección propia del documento. */
  area: AreaReporte;
  /** `YYYY-MM-DD` en día LOCAL; nunca `toISOString().split("T")[0]`. */
  fecha_reporte: string;
  conclusion: string;
  actividades: ActividadPayload[];
  fotos: FotoPayload[];
  proveedor_ids: number[];
}

// ── Lectura ────────────────────────────────────────────────────────────────

export interface ActividadReporte {
  id: number;
  orden: number;
  texto: string;
}

export interface FotoReporte {
  id: number;
  orden: number;
  pie: string;
  subida: boolean;
  ancho_px: number;
  alto_px: number;
  taken_at: string | null;
  /** SAS de lectura; `null` mientras la foto no ha subido. */
  thumbnail_url: string | null;
  url: string | null;
}

export interface ParticipanteReporte {
  id: number;
  nombre: string;
  tipo: TipoProveedor;
}

export interface ReporteListItem {
  id: number;
  client_id: string;
  fecha_reporte: string;
  construction: number;
  area: AreaReporte;
  /** Etiqueta ya resuelta por el servidor: "Seguridad e Higiene". */
  area_display: string;
  reportado_por: number;
  reportado_por_nombre: string;
  actividades_count: number;
  fotos_count: number;
  /** Declaradas que aún no confirman subida. Mientras sea > 0, no se genera. */
  fotos_pendientes: number;
  created_at: string;
}

export interface ReporteDetalle extends ReporteListItem {
  conclusion: string;
  actividades: ActividadReporte[];
  fotos: FotoReporte[];
  participantes: ParticipanteReporte[];
  /**
   * Espejo de la condición del 409 del backend: `false` mientras queden fotos
   * declaradas sin subir. Permite apagar los botones de Generar ANTES de pedir
   * el archivo, en vez de descubrirlo con un error. La autoridad sigue siendo
   * el endpoint de archivo.
   */
  puede_generar: boolean;
}

// ── Fotos ──────────────────────────────────────────────────────────────────

export interface FotoUploadResponse {
  foto_id: number;
  upload_url: string;
  blob_path: string;
  expires_at: string;
  instructions: {
    method: string;
    headers: Record<string, string>;
    note: string;
  };
}

export interface FotoConfirmResponse {
  foto_id: number;
  subida: boolean;
  ancho_px?: number;
  alto_px?: number;
  fotos_pendientes_del_reporte?: number;
}
