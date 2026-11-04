/**
 * Superficie de red del reporte de actividades diario (ADR-006).
 *
 * Todo lo que escribe pasa por la cola offline: **ninguna pantalla llama a
 * estas funciones de escritura directamente**. Es la misma regla que D13.1 del
 * ADR-004 fijó para la captura rápida — duplicar el pipeline rompería la
 * atomicidad de la cola y el conteo de pendientes.
 *
 * Las de lectura sí las consumen los hooks de React Query.
 */

import { apiRequest } from "src/services/api/apiClient";
import { API_CONFIG } from "src/services/api/config";
import type {
  FotoConfirmResponse,
  FotoUploadResponse,
  Proveedor,
  ReporteDetalle,
  ReporteListItem,
  ReportePayload,
} from "src/types/reporte";

const { proveedores, reportes } = API_CONFIG.endpoints;

// ── Roster de la obra ──────────────────────────────────────────────────────

/**
 * Contratistas activos de la obra. Alimenta la selección previa (P-00).
 *
 * Pega a `/api/proveedores/` y no a `/api/reportes/...`: el catálogo de
 * empresas es del negocio, no del formato UIN-RP-F-002. Vive en este archivo
 * porque hoy el reporte diario es su único consumidor; cuando haya otro, la
 * función se muda a un servicio propio.
 */
export const getProveedores = async (constructionId: number) =>
  await apiRequest<Proveedor[]>(
    "get",
    `${proveedores.lista}?construction_id=${constructionId}`,
    "Error al obtener los contratistas de la obra",
  );

// ── Escritura (solo desde el worker de la cola) ────────────────────────────

/**
 * Alta del reporte. **Idempotente por `client_id`**: un reintento tras una
 * respuesta perdida devuelve el reporte ya creado con 200 en vez de duplicarlo.
 *
 * La respuesta trae el detalle completo, incluidas las fotos ya declaradas con
 * su id de servidor — que es lo que la cola de fotos necesita para pedir su SAS.
 */
export const submitReporte = async (payload: ReportePayload) =>
  await apiRequest<ReporteDetalle>(
    "post",
    reportes.actividades,
    "Error al enviar el reporte",
    payload,
  );

/** Pide un SAS de escritura sobre la ruta que la foto ya tiene reservada. */
export const requestFotoUpload = async (fotoId: number) =>
  await apiRequest<FotoUploadResponse>(
    "post",
    reportes.fotoUpload,
    "Error al solicitar la subida de la fotografía",
    { foto_id: fotoId },
  );

/** Confirma la subida. Es idempotente: confirmar dos veces no tiene efecto. */
export const confirmFotoUpload = async (
  fotoId: number,
  uploadSuccessful: boolean,
  errorMessage?: string,
) =>
  await apiRequest<FotoConfirmResponse>(
    "post",
    reportes.fotoConfirmUpload,
    "Error al confirmar la subida de la fotografía",
    {
      foto_id: fotoId,
      upload_successful: uploadSuccessful,
      error_message: errorMessage ?? null,
    },
  );

// ── Consulta ───────────────────────────────────────────────────────────────

/**
 * Historial de la obra, más reciente primero. Abierto a todo miembro.
 *
 * **Pide una página.** El servidor pagina de 15 en 15 (`PAGE_SIZE`) y ordena
 * por `-fecha_reporte, -created_at`, así que la primera página son los 15 más
 * recientes. Antes se leía esa página y se ignoraba `next`: el reporte 16
 * hacia atrás existía en el servidor y era inalcanzable desde el teléfono, y
 * con un reporte diario una obra cruza ese muro en tres semanas.
 *
 * El tipo admite respuesta sin paginar por si algún entorno la tiene apagada.
 */
export const getReportesPorObra = async (
  constructionId: number,
  page = 1,
) =>
  await apiRequest<
    | ReporteListItem[]
    | {
        results: ReporteListItem[];
        next: string | null;
        /** Cuántos hay EN TOTAL en la obra, no cuántos trae esta página. */
        count: number;
      }
  >(
    "get",
    `${reportes.actividades}?construction_id=${constructionId}&page=${page}`,
    "Error al obtener los reportes de la obra",
  );

/**
 * Quita del servidor una foto declarada que nunca subió.
 *
 * **Es la válvula de escape del 409.** El endpoint de archivo se niega a
 * generar mientras quede una foto declarada sin subir —y hace bien: entregar
 * un reporte al que le falta evidencia que su autor dijo haber tomado sería
 * entregar algo incompleto sin avisar—. Esto es la salida: su autor declara
 * que esa foto no va.
 *
 * Solo el autor, y solo si no subió. Lo verifica el servidor; aquí no se
 * adivina.
 */
export const descartarFotoDeReporte = async (fotoId: number) =>
  await apiRequest<{ foto_id: number; fotos_pendientes_del_reporte: number }>(
    "delete",
    `${reportes.fotos}${fotoId}/`,
    "No se pudo descartar la fotografía",
  );

/** Detalle completo. Alimenta el Documento en Miniatura en modo lectura. */
export const getReporteDetalle = async (reporteId: number) =>
  await apiRequest<ReporteDetalle>(
    "get",
    `${reportes.actividades}${reporteId}/`,
    "Error al obtener el reporte",
  );
