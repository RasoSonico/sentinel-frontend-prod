import Realm from "realm";

export class TipoMaquinariaRealm extends Realm.Object<TipoMaquinariaRealm> {
  id!: number;
  nombre!: string;
  is_active!: boolean;

  static schema: Realm.ObjectSchema = {
    name: "TipoMaquinariaRealm",
    embedded: true,
    properties: {
      id: "int",
      nombre: "string",
      is_active: "bool",
    },
  };
}
