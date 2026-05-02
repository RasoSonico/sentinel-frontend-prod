import Realm from "realm";

export class PartidaItemRealm extends Realm.Object<PartidaItemRealm> {
  id!: number;
  catalog!: number;
  name!: string;

  static schema: Realm.ObjectSchema = {
    name: "PartidaItemRealm",
    embedded: true,
    properties: {
      id: "int",
      catalog: "int",
      name: "string",
    },
  };
}
