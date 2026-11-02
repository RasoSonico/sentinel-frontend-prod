import Realm from "realm";

import type { DetalleJornadaRealm } from "src/realm/maquinariaHub/DetalleJornadaRealm";

export type PendingCapturaStatus = "pending" | "syncing" | "failed" | "done";

/**
 * Cola offline de la hoja de jornada: una fila por CAPTURA (ADR-009 D1).
 *
 * Antes la unidad era la jornada, y eso hacía imposible el día real: el
 * arranque de la mañana y el cierre de la tarde eran dos envíos de LA MISMA
 * jornada, y la cola no sabía hacer `PATCH` ni fusionarlos (ADR-007 Deuda #6).
 * Ahora cada guardado es un `POST /capturas/` con su propia clave, y el
 * servidor decide a qué jornada va cada cosa. La cola vuelve a ser lo que
 * fue siempre: una lista de POST idempotentes.
 *
 * **El orden importa, por máquina.** Un cierre sin el arranque que cierra es
 * un 400. Por eso el worker manda las capturas de cada máquina en el orden en
 * que se guardaron, y si una falla, las siguientes de ESA máquina esperan
 * hasta que alguien la reintente o la descarte.
 *
 * **El `_id` es el `client_id`.** Se acuña al encolar: el reintento tras una
 * respuesta perdida en la red de la obra recibe 200 en vez de duplicar.
 *
 * Las máquinas dadas de alta sin señal se resuelven como antes: la captura
 * guarda `maquinariaLocalId` y espera a que el alta devuelva su estancia.
 */
export class PendingCapturaSubmission extends Realm.Object<PendingCapturaSubmission> {
  _id!: string; // UUID · client_id de idempotencia

  // ── A qué máquina ─────────────────────────────────────────────────────
  /** Estancia del servidor. 0 mientras espera a un alta encolada. */
  estanciaId!: number;
  maquinariaId!: number;
  /** `_id` del alta en cola si la máquina aún no existe en el servidor. */
  maquinariaLocalId!: string | null;

  // ── Cuándo y quién ────────────────────────────────────────────────────
  /** Fecha LOCAL del teléfono al guardar. */
  fecha!: string;
  /**
   * Hora del teléfono al guardar, en ISO. Viaja tal cual: la captura puede
   * subir horas después y lo que vale es cuándo se registró.
   */
  registradoEn!: string;
  /** "J. Pérez": para pintar lo encolado como registrado sin esperar al hub. */
  autor!: string;

  // ── Lo capturado ──────────────────────────────────────────────────────
  // Lecturas como CADENA: el flotante no representa exacto todas las décimas
  // y esto es la base sobre la que factura una renta.
  horometroInicial!: string | null;
  horometroFinal!: string | null;
  /**
   * Resolución de un cierre olvidado: el final de ese turno, o "dejarlo sin
   * final". Una captura así no lleva nada más (enmienda del 31-oct).
   */
  cerrarAnteriorFinal!: string | null;
  cerrarAnteriorSinFinal!: boolean;
  /** "SIN_OPERAR" o nulo. "Trabajando" no se declara: lo da la actividad. */
  estado!: string | null;
  motivoInactividad!: string | null;
  observaciones!: string;
  /**
   * Las actividades de esta captura. El `orden` es local —el de la hoja—; el
   * servidor lo continúa a partir del último renglón de la jornada.
   */
  detalles!: Realm.List<DetalleJornadaRealm>;

  // ── Contexto de presentación ──────────────────────────────────────────
  constructionId!: number;
  maquinariaEtiqueta!: string; // "Motoconformadora · CAT 140"

  // ── Metadatos de sincronización ───────────────────────────────────────
  status!: PendingCapturaStatus;
  createdAt!: Date;
  lastAttemptAt!: Date | null;
  failedAt!: Date | null;
  retryCount!: number;
  maxRetries!: number;
  errorMessage!: string | null;
  /**
   * El `motivo` de un 409 (`SIN_FINAL` · `TURNO_ABIERTO`), para que la
   * tarjeta diga algo más útil que "No se envió".
   */
  errorMotivo!: string | null;

  /** Fecha de la jornada donde aterrizó, según la respuesta del servidor. */
  jornadaFecha!: string | null;
  syncedAt!: Date | null;

  static schema: Realm.ObjectSchema = {
    name: "PendingCapturaSubmission",
    primaryKey: "_id",
    properties: {
      _id: "string",

      estanciaId: { type: "int", indexed: true },
      maquinariaId: "int",
      maquinariaLocalId: "string?",

      fecha: "string",
      registradoEn: "string",
      autor: { type: "string", default: "" },

      horometroInicial: "string?",
      horometroFinal: "string?",
      cerrarAnteriorFinal: "string?",
      cerrarAnteriorSinFinal: { type: "bool", default: false },
      estado: "string?",
      motivoInactividad: "string?",
      observaciones: { type: "string", default: "" },
      detalles: { type: "list", objectType: "DetalleJornadaRealm" },

      constructionId: "int",
      maquinariaEtiqueta: { type: "string", default: "" },

      status: { type: "string", indexed: true },
      createdAt: "date",
      lastAttemptAt: "date?",
      failedAt: "date?",
      retryCount: { type: "int", default: 0 },
      maxRetries: { type: "int", default: 3 },
      errorMessage: "string?",
      errorMotivo: "string?",

      jornadaFecha: "string?",
      syncedAt: "date?",
    },
  };
}
