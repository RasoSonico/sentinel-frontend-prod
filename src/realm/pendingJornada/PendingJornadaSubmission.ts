import Realm from "realm";

export type PendingJornadaStatus = "pending" | "syncing" | "failed" | "done";

/**
 * Cola offline de la jornada de maquinaria.
 *
 * Tercer espejo de `PendingAdvanceSubmission` y `PendingReporteSubmission`, a
 * propósito: un solo modelo mental de sincronización en toda la app. Lo que
 * cambia es la forma del payload, no la mecánica.
 *
 * **Es la más simple de las tres**: una jornada es un POST y se acabó. No hay
 * segunda fase como las fotos del reporte, así que el worker es un solo lazo.
 *
 * **El `_id` es el `client_id` que viaja en el body.** Se acuña al ENCOLAR, no
 * al enviar. El escenario que resuelve no es el doble toque: es que el POST
 * llegó y se aplicó, y la respuesta se perdió en la red de la obra. Sin esta
 * clave, el reintento chocaba contra `unique(estancia, fecha)` del servidor y
 * respondía "ya existe una jornada" a alguien convencido de que había fallado.
 *
 * Un punto que NO se parece a las otras dos colas: aquí el usuario puede
 * capturar la jornada de una máquina **que él mismo acaba de dar de alta sin
 * señal**. Esa cadena —alta primero, jornada después— es la segunda tanda, y
 * por eso `estanciaId` es un entero del servidor y no admite todavía un id
 * local. Cuando toque, es el mismo movimiento que hizo `reporteId` con las
 * fotos: reescribir el enlace cuando el POST del alta devuelva el id real.
 */
export class PendingJornadaSubmission extends Realm.Object<PendingJornadaSubmission> {
  _id!: string; // UUID · client_id de idempotencia

  // ── Payload ───────────────────────────────────────────────────────────
  /**
   * Estancia del servidor. Para una jornada transitoria viaja en 0: ese
   * endpoint crea la estancia él mismo a partir de `maquinariaId`.
   *
   * Vale 0 también mientras la jornada espera a un alta encolada: entonces el
   * que manda es `maquinariaLocalId`.
   */
  estanciaId!: number;
  maquinariaId!: number;
  /** `true` → va a `/jornadas/transitoria/`, que crea Estancia y Jornada. */
  esTransitoria!: boolean;

  /**
   * `_id` del alta en `PendingMaquinariaSubmission` cuando esta jornada es de
   * una máquina que todavía no existe en el servidor.
   *
   * Mientras no sea `null`, la jornada **no se puede enviar**: no hay estancia
   * a la que colgarla. El worker envía primero el alta, copia el `estancia_id`
   * que responde el servidor a `estanciaId`, limpia este campo, y recién
   * entonces la jornada entra al lazo de envío.
   *
   * Mismo mecanismo que `reporteLocalId` en las fotos del reporte; lo nuevo es
   * que aquí el enlace cruza de una cola a otra.
   */
  maquinariaLocalId!: string | null;

  fecha!: string; // YYYY-MM-DD, día LOCAL
  estado!: string; // TRABAJANDO | SIN_OPERAR
  catalogId!: number | null;
  conceptId!: number | null;
  motivoInactividad!: string | null;
  observaciones!: string;

  /**
   * Lecturas del horómetro, como CADENA.
   *
   * No como `double`: el flotante no representa exacto todas las décimas, y
   * este número es la base sobre la que factura una renta. Se manda tal como
   * lo tecleó la persona y el servidor lo guarda en `Decimal`.
   */
  horometroInicial!: string | null;
  horometroFinal!: string | null;

  // ── Contexto de presentación ──────────────────────────────────────────
  // Para que la tarjeta del hub pueda decir "reportada" sin red, antes de que
  // el servidor confirme nada.
  constructionId!: number;
  maquinariaEtiqueta!: string; // "Motoconformadora · CAT 140"

  // ── Metadatos de sincronización ───────────────────────────────────────
  status!: PendingJornadaStatus;
  createdAt!: Date;
  lastAttemptAt!: Date | null;
  failedAt!: Date | null;
  retryCount!: number;
  maxRetries!: number;
  errorMessage!: string | null;

  /** Id del servidor una vez que el POST responde. */
  jornadaId!: number | null;
  syncedAt!: Date | null;

  static schema: Realm.ObjectSchema = {
    name: "PendingJornadaSubmission",
    primaryKey: "_id",
    properties: {
      _id: "string",

      estanciaId: "int",
      maquinariaId: "int",
      esTransitoria: { type: "bool", default: false },
      maquinariaLocalId: "string?",

      fecha: "string",
      estado: "string",
      catalogId: "int?",
      conceptId: "int?",
      motivoInactividad: "string?",
      observaciones: { type: "string", default: "" },

      horometroInicial: "string?",
      horometroFinal: "string?",

      constructionId: "int",
      maquinariaEtiqueta: { type: "string", default: "" },

      status: { type: "string", indexed: true },
      createdAt: "date",
      lastAttemptAt: "date?",
      failedAt: "date?",
      retryCount: { type: "int", default: 0 },
      maxRetries: { type: "int", default: 3 },
      errorMessage: "string?",

      jornadaId: "int?",
      syncedAt: "date?",
    },
  };
}
