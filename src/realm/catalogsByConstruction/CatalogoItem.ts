import Realm from "realm";

export class CatalogoItemRealm extends Realm.Object<CatalogoItemRealm> {
  id!: number;
  construction!: number | null;
  name!: string;
  creation_date!: string;
  is_active!: boolean;
  reason_of_change!: string;

  static schema: Realm.ObjectSchema = {
    name: "CatalogoItemRealm",
    embedded: true,
    properties: {
      id: "int",
      construction: "int?",
      name: "string",
      creation_date: "string",
      is_active: "bool",
      reason_of_change: "string",
    },
  };
}
