export class AvanceBaseSection extends Realm.Object<AvanceBaseSection> {
  id!: number;
  name!: string;
  level!: number;
  parent_id!: number | null;
  work_item_id!: number;

  static schema: Realm.ObjectSchema = {
    name: "AvanceBaseSection",
    embedded: true,
    properties: {
      id: "int",
      name: "string",
      level: "int",
      parent_id: "int?",
      work_item_id: "int",
    },
  };
}
