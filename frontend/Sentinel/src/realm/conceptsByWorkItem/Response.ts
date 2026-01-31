import Realm from "realm";
import { ConceptoItemRealm } from "./ConceptoItem";

export class ConceptsByWorkItemResponse extends Realm.Object<ConceptsByWorkItemResponse> {
  _id!: string; // Format: "concepts-by-workitem-{workItemId}"
  concepts!: Realm.List<ConceptoItemRealm>;
  updatedAt!: Date;

  static schema: Realm.ObjectSchema = {
    name: "ConceptsByWorkItemResponse",
    primaryKey: "_id",
    properties: {
      _id: "string",
      concepts: {
        type: "list",
        objectType: "ConceptoItemRealm",
      },
      updatedAt: "date",
    },
  };
}
