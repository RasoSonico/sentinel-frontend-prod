import { AvanceBaseConcept } from "./Concept";
import { AvanceBaseSection } from "./Section";

export class AvanceBaseWorkItem extends Realm.Object<AvanceBaseWorkItem> {
  id!: number;
  name!: string;
  sections!: Realm.List<AvanceBaseSection>;
  concepts!: Realm.List<AvanceBaseConcept>;

  static schema: Realm.ObjectSchema = {
    name: "AvanceBaseWorkItem",
    embedded: true,
    properties: {
      id: "int",
      name: "string",
      sections: {
        type: "list",
        objectType: "AvanceBaseSection",
      },
      concepts: {
        type: "list",
        objectType: "AvanceBaseConcept",
      },
    },
  };
}
