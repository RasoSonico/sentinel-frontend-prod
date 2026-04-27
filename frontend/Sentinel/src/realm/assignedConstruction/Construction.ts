import Realm from "realm";

export class ConstructionRealm extends Realm.Object<ConstructionRealm> {
  _id!: string; // Primary key, same as id
  id!: string;
  name!: string;
  description!: string;
  location!: string;
  country?: string;
  state?: string;
  client?: string;
  budget!: string;
  creation_date?: string;
  start_date!: string;
  end_date!: string;
  status!: string;
  created_at?: string;
  updated_at?: string;

  static schema: Realm.ObjectSchema = {
    name: "ConstructionRealm",
    primaryKey: "_id",
    properties: {
      _id: "string",
      id: "string",
      name: "string",
      description: "string",
      location: "string",
      country: "string?",
      state: "string?",
      client: "string?",
      budget: "string",
      creation_date: "string?",
      start_date: "string",
      end_date: "string",
      status: "string",
      created_at: "string?",
      updated_at: "string?",
    },
  };
}
