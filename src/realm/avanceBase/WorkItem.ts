import { AvanceBaseConcept } from "./Concept";

export class AvanceBaseWorkItem extends Realm.Object<AvanceBaseWorkItem> {
  id!: number;
  name!: string;
  concepts!: Realm.List<AvanceBaseConcept>;

  static schema: Realm.ObjectSchema = {
    name: "AvanceBaseWorkItem",
    embedded: true,
    properties: {
      id: "int",
      name: "string",
      concepts: {
        type: "list",
        objectType: "AvanceBaseConcept",
      },
    },
  };
}
