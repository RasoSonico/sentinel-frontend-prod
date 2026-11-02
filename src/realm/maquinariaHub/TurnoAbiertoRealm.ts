import Realm from "realm";

/**
 * El turno sin final de una máquina, sea del día que sea.
 *
 * Es lo que permite al teléfono, sin señal, saber dos cosas: que no debe
 * mandar otro inicial —el servidor lo rechazaría con 409— y si ese turno es
 * un nocturno en curso o un cierre olvidado (`olvidado_en`).
 */
export class TurnoAbiertoRealm extends Realm.Object<TurnoAbiertoRealm> {
  id!: number;
  jornada_fecha!: string;
  inicial!: string | null;
  desde!: string;
  olvidado_en!: string;

  static schema: Realm.ObjectSchema = {
    name: "TurnoAbiertoRealm",
    embedded: true,
    properties: {
      id: "int",
      jornada_fecha: "string",
      inicial: "string?",
      desde: "string",
      olvidado_en: "string",
    },
  };
}
