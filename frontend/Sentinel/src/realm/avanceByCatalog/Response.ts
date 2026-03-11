import Realm from "realm";
import { PhysicalAdvanceResponse } from "./PhysicalAdvanceResponse";

export class AvancesByCatalogResponse extends Realm.Object<AvancesByCatalogResponse> {
  _id!: string; // derived from queryKey or constructionId
  advances!: Realm.List<PhysicalAdvanceResponse>;
  count!: number;
  updatedAt!: Date;

  static schema: Realm.ObjectSchema = {
    name: "AvancesByCatalogResponse",
    primaryKey: "_id",
    properties: {
      _id: "string",
      advances: {
        type: "list",
        objectType: "PhysicalAdvanceResponse",
      },
      count: "int",
      updatedAt: "date",
    },
  };
}
