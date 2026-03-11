import Realm from "realm";

export type PendingAdvanceStatus = "pending" | "syncing" | "failed";

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
    },
  };
}
