import Realm from "realm";

export type PendingMaquinariaStatus = "pending" | "syncing" | "failed" | "done";

/**
 * Cola offline del alta de maquinaria.
 *
 * **Es la primera cola de la app con dependencias hacia adelante**, y eso es
 * lo único que la distingue de las otras tres. Un avance, un reporte o una
 * jornada son hechos sueltos: se envían en cualquier orden y nadie espera a
 * nadie. Un alta, no.
 *
 * ```
 * POST /maquinarias/  →  crea Maquinaria + su primera Estancia
 *                     →  devuelve estancia_id
 *                            ↓
 *                     de ese id cuelga CADA jornada de esa máquina
 * ```
 *
 * Así que una máquina dada de alta sin señal, cuya jornada se captura el mismo
 * día —que es exactamente lo que pasa cuando una máquina llega a la obra—
 * produce una jornada que apunta a una estancia que el servidor todavía no
 * conoce. La jornada guarda `maquinariaLocalId` en vez de `estanciaId`, y el
 * worker reescribe el enlace cuando el alta responde.
 *
 * No es un mecanismo nuevo: es lo mismo que hacen las fotos del reporte con
 * `reporteLocalId`. Lo que cambia es que aquí el enlace cruza dos colas.
 */
export class PendingMaquinariaSubmission extends Realm.Object<PendingMaquinariaSubmission> {
  _id!: string; // UUID · client_id de idempotencia

  // ── Payload ───────────────────────────────────────────────────────────
  constructionId!: number;
  tipoId!: number;
  marca!: string;
  modelo!: string;
  propietarioTipo!: string;
  tipoPermanencia!: string;
  fechaIngreso!: string; // YYYY-MM-DD

  /** Nombre del tipo, para pintar la tarjeta sin consultar el catálogo. */
  tipoNombre!: string;

  // ── Metadatos de sincronización ───────────────────────────────────────
  status!: PendingMaquinariaStatus;
  createdAt!: Date;
  lastAttemptAt!: Date | null;
  failedAt!: Date | null;
  retryCount!: number;
  maxRetries!: number;
  errorMessage!: string | null;

  /** Ids del servidor una vez que el POST responde. */
  maquinariaId!: number | null;
  /**
   * Estancia que el servidor abrió junto con la máquina.
   *
   * **Es la pieza que cierra el círculo**: con ella el worker reescribe el
   * `estanciaId` de las jornadas que estaban esperando a esta alta.
   */
  estanciaId!: number | null;
  syncedAt!: Date | null;

  static schema: Realm.ObjectSchema = {
    name: "PendingMaquinariaSubmission",
    primaryKey: "_id",
    properties: {
      _id: "string",

      constructionId: "int",
      tipoId: "int",
      marca: "string",
      modelo: { type: "string", default: "" },
      propietarioTipo: "string",
      tipoPermanencia: "string",
      fechaIngreso: "string",
      tipoNombre: { type: "string", default: "" },

      status: { type: "string", indexed: true },
      createdAt: "date",
      lastAttemptAt: "date?",
      failedAt: "date?",
      retryCount: { type: "int", default: 0 },
      maxRetries: { type: "int", default: 3 },
      errorMessage: "string?",

      maquinariaId: "int?",
      estanciaId: "int?",
      syncedAt: "date?",
    },
  };
}
