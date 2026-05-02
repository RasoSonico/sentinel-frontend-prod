import Realm from "realm";
import { PartidaItemRealm } from "./PartidaItem";

export class PartidasByCatalogResponse extends Realm.Object<PartidasByCatalogResponse> {
  _id!: string; // Format: "partidas-by-catalog-{catalogId}"
  partidas!: Realm.List<PartidaItemRealm>;
  updatedAt!: Date;

  static schema: Realm.ObjectSchema = {
    name: "PartidasByCatalogResponse",
    primaryKey: "_id",
    properties: {
      _id: "string",
      partidas: {
        type: "list",
        objectType: "PartidaItemRealm",
      },
      updatedAt: "date",
    },
  };
}
