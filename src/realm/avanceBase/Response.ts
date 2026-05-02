import { AvanceBaseCatalog } from "./Catalog";
import { AvanceBaseMeta } from "./Meta";

export class AvanceBaseResponse extends Realm.Object<AvanceBaseResponse> {
  _id!: string; // derived from queryKey or constructionId
  catalogs!: Realm.List<AvanceBaseCatalog>;
  meta!: AvanceBaseMeta;
  updatedAt!: Date;

  static schema: Realm.ObjectSchema = {
    name: "AvanceBaseResponse",
    primaryKey: "_id",
    properties: {
      _id: "string",
      catalogs: {
        type: "list",
        objectType: "AvanceBaseCatalog",
      },
      meta: "AvanceBaseMeta",
      updatedAt: "date",
    },
  };
}
