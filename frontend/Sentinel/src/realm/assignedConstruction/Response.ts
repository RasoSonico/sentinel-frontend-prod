import Realm from "realm";
import { ConstructionRealm } from "./Construction";

export class AssignedConstructionResponse extends Realm.Object<AssignedConstructionResponse> {
  _id!: string; // Format: "assigned-construction-{role}"
  constructions!: Realm.List<ConstructionRealm>;
  selectedConstructionId?: string;
  updatedAt!: Date;

  static schema: Realm.ObjectSchema = {
    name: "AssignedConstructionResponse",
    primaryKey: "_id",
    properties: {
      _id: "string",
      constructions: { type: "list", objectType: "ConstructionRealm" },
      selectedConstructionId: "string?",
      updatedAt: "date",
    },
  };
}
