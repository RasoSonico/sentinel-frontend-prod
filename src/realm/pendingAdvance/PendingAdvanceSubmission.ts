import Realm from "realm";

export type PendingAdvanceStatus = "pending" | "syncing" | "failed" | "done";

export class PendingAdvanceSubmission extends Realm.Object<PendingAdvanceSubmission> {
  _id!: string;

  // API payload data
  conceptId!: number;
  volume!: string;
  comments!: string;

  // Display context (for UI without re-fetching)
  catalogId!: number;
  catalogName!: string;
  workItemId!: number;
  workItemName!: string;
  conceptDescription!: string;
  constructionId!: number;

  // Sync metadata
  status!: PendingAdvanceStatus;
  createdAt!: Date;
  lastAttemptAt!: Date | null;
  failedAt!: Date | null;
  retryCount!: number;
  maxRetries!: number;
  errorMessage!: string | null;

  /**
   * Marca de agua para reconciliar la cola con el snapshot del servidor
   * (enmienda E8 del ADR-004).
   *
   * `null` mientras el avance no ha sincronizado. Cuando sincroniza se sella
   * con la hora local, y a partir de ahí la regla es:
   *
   *   este item aporta su volumen SOLO si `syncedAt` es null, o si es
   *   POSTERIOR al `updatedAt` de AvanceBaseResponse
   *
   * Es decir: cuenta mientras el snapshot del servidor todavía no lo incluye.
   * Sin esto, sumar cola + cache produce un BAJÓN —el usuario ve desaparecer su
   * captura— o un DOBLE CONTEO, según si el item se borra al sincronizar o se
   * conserva. Con la marca, el refresco del cache es visualmente invisible.
   *
   * Ambas marcas las escribe el MISMO dispositivo, así que no hay desfase de
   * reloj posible. Si alguna llegara del servidor, habría que migrar a un
   * contador monotónico.
   */
  syncedAt!: Date | null;

  static schema: Realm.ObjectSchema = {
    name: "PendingAdvanceSubmission",
    primaryKey: "_id",
    properties: {
      _id: "string",

      // API payload data
      conceptId: "int",
      volume: "string",
      comments: "string",

      // Display context
      catalogId: "int",
      catalogName: "string",
      workItemId: "int",
      workItemName: "string",
      conceptDescription: "string",
      constructionId: "int",

      // Sync metadata
      status: "string",
      createdAt: "date",
      lastAttemptAt: "date?",
      failedAt: "date?",
      retryCount: { type: "int", default: 0 },
      maxRetries: { type: "int", default: 3 },
      errorMessage: "string?",
      syncedAt: "date?",
    },
  };
}
