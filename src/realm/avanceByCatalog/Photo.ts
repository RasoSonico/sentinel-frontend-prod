import Realm from "realm";

export class AdvancePhoto extends Realm.Object<AdvancePhoto> {
  id!: string;
  url!: string;
  thumbnail_url!: string;
  created_at!: string;

  static schema: Realm.ObjectSchema = {
    name: "AdvancePhoto",
    embedded: true,
    properties: {
      id: "string",
      url: "string",
      thumbnail_url: "string",
      created_at: "string",
    },
  };
}
