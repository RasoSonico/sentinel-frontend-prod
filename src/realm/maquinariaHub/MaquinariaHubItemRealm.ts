import Realm from "realm";

import type { DetalleJornadaRealm } from "./DetalleJornadaRealm";
import type { JornadaHubRealm } from "./JornadaHubRealm";
import type { TurnoAbiertoRealm } from "./TurnoAbiertoRealm";

/**
 * Una máquina del hub, como la deja el último refetch con señal.
 *
 * Desde la reforma de capturas (ADR-009) lleva la jornada de hoy COMPLETA
 * —turnos, renglones, autores y horas— y no unos cuantos campos aplanados: la
 * hoja de jornada se vuelve a abrir para leer lo registrado y completar lo
 * que falta, y eso se hace en obra, sin red.
 *
 * Lo que diga aquí es la versión del SERVIDOR. Lo capturado en el teléfono y
 * todavía no enviado se funde encima en `diaMaquina.ts`; ninguna pantalla lee
 * esto a solas.
 */
export class MaquinariaHubItemRealm extends Realm.Object<MaquinariaHubItemRealm> {
  id!: number;
  tipo!: string;
  marca!: string;
  modelo!: string;
  propietario_tipo!: string;
  tipo_permanencia!: string;
  estancia_id!: number;
  estancia_fecha_ingreso!: string;
  /** SIN_REPORTAR · TRABAJANDO · NO_OPERO, según el servidor. */
  estado_dia!: string;
  actividades_hoy!: number;
  falta_horometro!: boolean;
  jornada_hoy!: JornadaHubRealm | null;
  turno_abierto!: TurnoAbiertoRealm | null;
  /** La jornada del turno abierto cuando es de otro día: el nocturno. */
  jornada_turno_abierto!: JornadaHubRealm | null;
  /** SIN_FINAL · RECONCILIACION, o nulo. */
  requiere_atencion!: string | null;
  dias_sin_reporte!: number;
  ultima_jornada_fecha!: string | null;
  // Último final de turno y su fecha: la sugerencia del inicial, sin red.
  ultimo_horometro!: string | null;
  ultimo_horometro_fecha!: string | null;
  /** El último día que de verdad trabajó: alimenta "Repetir lo del {fecha}". */
  ultima_jornada_trabajada_fecha!: string | null;
  ultima_jornada_trabajada_detalles!: Realm.List<DetalleJornadaRealm>;

  static schema: Realm.ObjectSchema = {
    name: "MaquinariaHubItemRealm",
    embedded: true,
    properties: {
      id: "int",
      tipo: "string",
      marca: "string",
      modelo: "string",
      propietario_tipo: "string",
      tipo_permanencia: "string",
      estancia_id: "int",
      estancia_fecha_ingreso: "string",
      estado_dia: { type: "string", default: "SIN_REPORTAR" },
      actividades_hoy: { type: "int", default: 0 },
      falta_horometro: { type: "bool", default: false },
      jornada_hoy: { type: "object", objectType: "JornadaHubRealm", optional: true },
      turno_abierto: { type: "object", objectType: "TurnoAbiertoRealm", optional: true },
      jornada_turno_abierto: {
        type: "object",
        objectType: "JornadaHubRealm",
        optional: true,
      },
      requiere_atencion: "string?",
      dias_sin_reporte: "int",
      ultima_jornada_fecha: "string?",
      ultimo_horometro: "string?",
      ultimo_horometro_fecha: "string?",
      ultima_jornada_trabajada_fecha: "string?",
      ultima_jornada_trabajada_detalles: {
        type: "list",
        objectType: "DetalleJornadaRealm",
      },
    },
  };
}
