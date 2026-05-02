import Realm from "realm";

export class ConstructionRealm extends Realm.Object<ConstructionRealm> {
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
    embedded: true,
    properties: {
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
