import Realm from "realm";

export type PendingReporteStatus = "pending" | "syncing" | "failed" | "done";

/**
 * Cola offline del reporte de actividades diario (ADR-006, Decisión 7).
 *
 * Espejo de `PendingAdvanceSubmission`, y a propósito: un solo modelo mental de
 * sincronización en toda la app. Lo que cambia es la forma del payload —un
 * reporte lleva actividades, pies de foto y participantes— no la mecánica.
 *
 * **El `_id` es el `client_id` que viaja en el body del POST.** Se acuña al
 * ENCOLAR, no al enviar: es lo que hace la idempotencia real ante reintentos
 * de red y ante dobles toques del botón. El servidor responde el reporte ya
 * creado en lugar de duplicarlo.
 *
 * Las listas van serializadas en JSON en vez de como objetos embebidos de
 * Realm. Son datos de tránsito —viven lo que tarda el POST en pasar— y
 * modelarlas como clases embebidas obligaría a dos clases más en el esquema,
 * con su migración, para nada: nadie las consulta ni las filtra, solo se
 * escriben una vez y se leen una vez. El borrador del wizard es otra cosa y
 * vive en estado de React, no aquí.
 */
export class PendingReporteSubmission extends Realm.Object<PendingReporteSubmission> {
  _id!: string; // UUID · client_id de idempotencia

  // Payload
  constructionId!: number;
  /** Clave del área (`TOPOGRAFIA`, …). Obligatoria en el POST. */
  area!: string;
  fechaReporte!: string; // YYYY-MM-DD, día LOCAL (ver DateUtils, D9 del ADR-003)
  conclusion!: string;
  /** `[{ orden, texto }]` serializado */
  actividadesJson!: string;
  /** `[{ orden, pie, filename, localUri, takenAt, deviceModel }]` serializado */
  fotosJson!: string;
  /** `[ids]` de TODO lo palomeado en P-00: contratistas y supervisión */
  proveedorIdsJson!: string;

  // Contexto de presentación, para pintar la fila "Por enviar" sin red
  constructionName!: string;
  /** Nombres de los contratistas, para el Documento en Miniatura local */
  contratistasJson!: string;
  /** Nombres de la supervisión, para la misma miniatura sin red */
  supervisionJson!: string;
  actividadesCount!: number;
  fotosCount!: number;

  // Metadatos de sincronización
  status!: PendingReporteStatus;
  createdAt!: Date;
  lastAttemptAt!: Date | null;
  failedAt!: Date | null;
  retryCount!: number;
  maxRetries!: number;
  errorMessage!: string | null;

  /** Id del servidor una vez que el POST responde. Habilita subir las fotos. */
  reporteId!: number | null;
  syncedAt!: Date | null;

  static schema: Realm.ObjectSchema = {
    name: "PendingReporteSubmission",
    primaryKey: "_id",
    properties: {
      _id: "string",

      constructionId: "int",
      area: { type: "string", default: "" },
      fechaReporte: "string",
      conclusion: "string",
      actividadesJson: "string",
      fotosJson: "string",
      proveedorIdsJson: "string",

      constructionName: "string",
      contratistasJson: "string",
      supervisionJson: { type: "string", default: "[]" },
      actividadesCount: "int",
      fotosCount: "int",

      status: { type: "string", indexed: true },
      createdAt: "date",
      lastAttemptAt: "date?",
      failedAt: "date?",
      retryCount: { type: "int", default: 0 },
      maxRetries: { type: "int", default: 3 },
      errorMessage: "string?",

      reporteId: "int?",
      syncedAt: "date?",
    },
  };
}
