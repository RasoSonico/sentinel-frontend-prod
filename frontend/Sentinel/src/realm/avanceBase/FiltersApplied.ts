export class AvanceBaseFiltersApplied extends Realm.Object<AvanceBaseFiltersApplied> {
  construction_id!: number | null;
  active_only!: boolean;

  static schema: Realm.ObjectSchema = {
    name: "AvanceBaseFiltersApplied",
    embedded: true,
    properties: {
      construction_id: "int?",
      active_only: "bool",
    },
  };
}
