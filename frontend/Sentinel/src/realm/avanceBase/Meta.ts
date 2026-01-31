import { AvanceBaseFiltersApplied } from "./FiltersApplied";

export class AvanceBaseMeta extends Realm.Object<AvanceBaseMeta> {
  total_catalogs!: number;
  total_work_items!: number;
  total_concepts!: number;
  user_constructions!: Realm.List<number>;
  filters_applied!: AvanceBaseFiltersApplied;
  generated_at!: string;

  static schema: Realm.ObjectSchema = {
    name: "AvanceBaseMeta",
    embedded: true,
    properties: {
      total_catalogs: "int",
      total_work_items: "int",
      total_concepts: "int",
      user_constructions: {
        type: "list",
        objectType: "int",
      },
      filters_applied: "AvanceBaseFiltersApplied",
      generated_at: "string",
    },
  };
}
