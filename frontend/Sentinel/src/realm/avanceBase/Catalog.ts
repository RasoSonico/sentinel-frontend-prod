import { AvanceBaseWorkItem } from "./WorkItem";

export class AvanceBaseCatalog extends Realm.Object<AvanceBaseCatalog> {
  id!: number;
  name!: string;
  construction_id!: number;
  construction_name!: string;
  work_items!: Realm.List<AvanceBaseWorkItem>;

  static schema: Realm.ObjectSchema = {
    name: "AvanceBaseCatalog",
    embedded: true,
    properties: {
      id: "int",
      name: "string",
      construction_id: "int",
      construction_name: "string",
      work_items: {
        type: "list",
        objectType: "AvanceBaseWorkItem",
      },
    },
  };
}
