import Realm from "realm";
import { TipoMaquinariaRealm } from "./TipoMaquinariaRealm";

export class TiposMaquinariaResponse extends Realm.Object<TiposMaquinariaResponse> {
  _id!: string; // singleton: "tipos-maquinaria"
  tipos!: Realm.List<TipoMaquinariaRealm>;
  updatedAt!: Date;

  static schema: Realm.ObjectSchema = {
    name: "TiposMaquinariaResponse",
    primaryKey: "_id",
    properties: {
      _id: "string",
      tipos: {
        type: "list",
        objectType: "TipoMaquinariaRealm",
      },
      updatedAt: "date",
    },
  };
}
