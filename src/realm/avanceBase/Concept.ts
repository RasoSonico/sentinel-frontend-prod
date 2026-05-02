export class AvanceBaseConcept extends Realm.Object<AvanceBaseConcept> {
  id!: number;
  description!: string;
  unit!: string;
  quantity!: string;
  price!: string;
  clasification!: string;
  cumulative_volume!: string;
  quantity_left!: string;

  static schema: Realm.ObjectSchema = {
    name: "AvanceBaseConcept",
    embedded: true, // important: lives inside parent, no standalone lifecycle
    properties: {
      id: "int",
      description: "string",
      unit: "string",
      quantity: "string",
      price: "string",
      clasification: "string",
      cumulative_volume: "string",
      quantity_left: "string",
    },
  };
}
