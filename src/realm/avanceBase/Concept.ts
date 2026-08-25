import { UltimaCarga } from "./UltimaCarga";

export class AvanceBaseConcept extends Realm.Object<AvanceBaseConcept> {
  id!: number;
  description!: string;
  unit!: string;
  quantity!: string;
  price!: string;
  clasification!: string;
  cumulative_volume!: string;
  quantity_left!: string;
  section_id!: number | null;
  wbs_code!: string | null;
  // Las 4 cargas más recientes (ver UltimaCarga). Lista vacía cuando el
  // concepto no tiene avances — el backend nunca omite la clave.
  ultimas_cargas!: Realm.List<UltimaCarga>;

  static schema: Realm.ObjectSchema = {
    name: "AvanceBaseConcept",
    embedded: true,
    properties: {
      id: "int",
      description: "string",
      unit: "string",
      quantity: "string",
      price: "string",
      clasification: "string",
      cumulative_volume: "string",
      quantity_left: "string",
      section_id: "int?",
      wbs_code: "string?",
      ultimas_cargas: { type: "list", objectType: "UltimaCarga" },
    },
  };
}
