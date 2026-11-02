import Realm from "realm";

/**
 * Un turno del horómetro: una lectura inicial y una final (backend B2).
 *
 * Embebido en la jornada del caché del hub. Las lecturas y las horas son
 * CADENA por lo mismo que en todo el módulo: el servidor las manda así y el
 * flotante perdería décimas de algo sobre lo que factura una renta.
 */
export class TurnoRealm extends Realm.Object<TurnoRealm> {
  id!: number;
  inicial!: string | null;
  final!: string | null;
  horas!: string | null;
  desde!: string;
  hasta!: string | null;
  autor_inicio!: string | null;
  autor_cierre!: string | null;
  cerrado_sin_final!: boolean;

  static schema: Realm.ObjectSchema = {
    name: "TurnoRealm",
    embedded: true,
    properties: {
      id: "int",
      inicial: "string?",
      final: "string?",
      horas: "string?",
      desde: "string",
      hasta: "string?",
      autor_inicio: "string?",
      autor_cierre: "string?",
      cerrado_sin_final: { type: "bool", default: false },
    },
  };
}
