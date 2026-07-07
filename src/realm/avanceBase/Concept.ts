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
    },
  };
}
