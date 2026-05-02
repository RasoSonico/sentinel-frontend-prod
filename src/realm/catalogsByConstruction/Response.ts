import Realm from "realm";
import { CatalogoItemRealm } from "./CatalogoItem";

export class CatalogsByConstructionResponse extends Realm.Object<CatalogsByConstructionResponse> {
  _id!: string; // Format: "catalogs-by-construction-{constructionId}"
  catalogs!: Realm.List<CatalogoItemRealm>;
  updatedAt!: Date;

  static schema: Realm.ObjectSchema = {
    name: "CatalogsByConstructionResponse",
    primaryKey: "_id",
    properties: {
      _id: "string",
      catalogs: {
        type: "list",
        objectType: "CatalogoItemRealm",
      },
      updatedAt: "date",
    },
  };
}
