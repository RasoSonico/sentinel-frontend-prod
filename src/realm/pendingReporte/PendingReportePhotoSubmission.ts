import Realm from "realm";

export type PendingReportePhotoStatus =
  | "pending"
  | "waiting"
  | "syncing"
  | "uploaded"
  | "failed"
  | "done";

/**
 * Cola de fotos del reporte (ADR-006, Decisión 7). Espejo de
 * `PendingPhotoSubmission`, con el mismo flujo de estados:
 *
 * - `pending`  — capturada; el reporte todavía no sincroniza
 * - `waiting`  — el reporte sincronizó y `fotoRemotaId` ya existe: lista para subir
 * - `syncing`  — subiendo a Azure
 * - `uploaded` — los bytes llegaron pero falta confirmar (el reintento SOLO confirma)
 * - `failed`   — agotó los reintentos
 * - `done`     — subida y confirmada
 *
 * La diferencia con avances está en de dónde sale `fotoRemotaId`: en avances la
 * fila de foto la crea el endpoint de SAS, aquí la crea el POST del reporte
 * junto con el resto del registro. Es lo que sostiene la política del 409 del
 * backend —las fotos están declaradas desde el primer segundo— y de paso hace
 * que pedir el SAS sea idempotente: la ruta del blob ya está reservada y no
 * caduca, solo el token.
 */
export class PendingReportePhotoSubmission extends Realm.Object<PendingReportePhotoSubmission> {
  _id!: string; // UUID local

  /** Liga con `PendingReporteSubmission._id` */
  reporteLocalId!: string;
  /** Id de `FotoReporte` en el servidor; se llena al sincronizar el reporte */
  fotoRemotaId!: number | null;
  constructionId!: number;

  /** Posición en el documento. El numeral impreso se calcula al pintar. */
  orden!: number;
  pie!: string;

  // Archivo local
  localUri!: string;
  filename!: string;
  fileSize!: number;
  takenAt!: Date;

  // Sincronización
  status!: PendingReportePhotoStatus;
  createdAt!: Date;
  lastAttemptAt!: Date | null;
  retryCount!: number;
  maxRetries!: number;
  errorMessage!: string | null;

  static schema: Realm.ObjectSchema = {
    name: "PendingReportePhotoSubmission",
    primaryKey: "_id",
    properties: {
      _id: "string",

      reporteLocalId: { type: "string", indexed: true },
      fotoRemotaId: "int?",
      constructionId: "int",

      orden: "int",
      pie: "string",

      localUri: "string",
      filename: "string",
      fileSize: "int",
      takenAt: "date",

      status: { type: "string", indexed: true },
      createdAt: "date",
      lastAttemptAt: "date?",
      retryCount: { type: "int", default: 0 },
      maxRetries: { type: "int", default: 3 },
      errorMessage: "string?",
    },
  };
}
