import Realm from "realm";
import { ConstructionRealm } from "./Construction";

export class AssignedConstructionResponse extends Realm.Object<AssignedConstructionResponse> {
  _id!: string; // Format: "assigned-construction-{role}"
  construction!: ConstructionRealm | null;
  updatedAt!: Date;

  static schema: Realm.ObjectSchema = {
    name: "AssignedConstructionResponse",
    primaryKey: "_id",
    properties: {
      _id: "string",
      construction: "ConstructionRealm?",
      updatedAt: "date",
    },
  };
}
