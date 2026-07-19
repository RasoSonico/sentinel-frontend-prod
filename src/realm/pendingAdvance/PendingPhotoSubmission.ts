import Realm from "realm";

export type PendingPhotoStatus =
  | "pending"
  | "waiting"
  | "syncing"
  | "uploaded"
  | "failed"
  | "done";

/**
 * Realm schema for pending photo submissions.
 *
 * Status flow:
 * - "pending": Photo captured, advance not synced yet
 * - "waiting": Advance synced, physicalAdvanceId set, ready to upload
 * - "syncing": Currently uploading to Azure
 * - "uploaded": Uploaded to Azure, pending confirmation (retry will only confirm)
 * - "failed": Upload or confirmation failed after max retries
 * - "done": Uploaded AND confirmed; se conserva en la cola solo hasta que el
 *   refetch de avances refleje el nuevo photo_count, y entonces se elimina.
 *   Evita que el contador Fotos del Hoy cuente hacia abajo mientras cada foto
 *   sale de la cola antes de que el cache del servidor la refleje.
 */
export class PendingPhotoSubmission extends Realm.Object<PendingPhotoSubmission> {
  _id!: string; // Photo UUID

  // Link to parent advance
  advanceLocalId!: string; // Links to PendingAdvanceSubmission._id
  physicalAdvanceId!: number | null; // Set after advance syncs successfully
  constructionId!: number; // Construction ID for API upload

  // File info
  localUri!: string; // FileSystem path
  filename!: string;
  fileSize!: number;

  // Location metadata
  latitude!: number | null;
  longitude!: number | null;
  gpsAccuracy!: number | null;
  takenAt!: Date;

  // Sync status
  status!: PendingPhotoStatus;
  createdAt!: Date;
  lastAttemptAt!: Date | null;
  retryCount!: number;
  maxRetries!: number;
  errorMessage!: string | null;

  // Remote tracking (for retry scenarios)
  remotePhotoId!: string | null; // photo_id from API, needed to retry confirmation

  static schema: Realm.ObjectSchema = {
    name: "PendingPhotoSubmission",
    primaryKey: "_id",
    properties: {
      _id: "string",

      // Link to parent advance
      advanceLocalId: { type: "string", indexed: true },
      physicalAdvanceId: "int?",
      constructionId: "int",

      // File info
      localUri: "string",
      filename: "string",
      fileSize: "int",

      // Location metadata
      latitude: "double?",
      longitude: "double?",
      gpsAccuracy: "double?",
      takenAt: "date",

      // Sync status
      status: { type: "string", indexed: true },
      createdAt: "date",
      lastAttemptAt: "date?",
      retryCount: { type: "int", default: 0 },
      maxRetries: { type: "int", default: 3 },
      errorMessage: "string?",

      // Remote tracking
      remotePhotoId: "string?",
    },
  };
}
