import Realm from "realm";

import type { DetalleJornadaRealm } from "./DetalleJornadaRealm";
import type { TurnoRealm } from "./TurnoRealm";

/**
 * Una jornada completa dentro del caché del hub: la de hoy, y la del turno
 * abierto cuando es de otro día (el nocturno).
 *
 * Vive en el caché y no se pide al abrir la hoja porque la jornada se captura
 * en obra, donde puede no haber señal: lo registrado tiene que poder leerse
 * sin red. Los nombres son los del servidor para que el paso del JSON a Realm
 * no traduzca nada.
 */
export class JornadaHubRealm extends Realm.Object<JornadaHubRealm> {
  id!: number;
  fecha!: string;
  /** Null mientras no se haya reportado: el arranque no reporta. */
  estado!: string | null;
  motivo_inactividad!: string | null;
  observaciones!: string;
  turnos!: Realm.List<TurnoRealm>;
  horas_maquina!: string | null;
  detalles!: Realm.List<DetalleJornadaRealm>;

  static schema: Realm.ObjectSchema = {
    name: "JornadaHubRealm",
    embedded: true,
    properties: {
      id: "int",
      fecha: "string",
      estado: "string?",
      motivo_inactividad: "string?",
      observaciones: { type: "string", default: "" },
      turnos: { type: "list", objectType: "TurnoRealm" },
      horas_maquina: "string?",
      detalles: { type: "list", objectType: "DetalleJornadaRealm" },
    },
  };
}

