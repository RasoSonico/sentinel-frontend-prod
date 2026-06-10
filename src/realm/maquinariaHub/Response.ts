import Realm from "realm";
import { MaquinariaHubItemRealm } from "./MaquinariaHubItemRealm";

export class MaquinariaHubResponse extends Realm.Object<MaquinariaHubResponse> {
  _id!: string; // "hub-diario-{constructionId}"
  fecha!: string;
  total_en_sitio!: number;
  reportadas_hoy!: number;
  sin_reportar!: number;
  sin_operar!: number;
  maquinarias!: Realm.List<MaquinariaHubItemRealm>;
  updatedAt!: Date;

  static schema: Realm.ObjectSchema = {
    name: "MaquinariaHubResponse",
    primaryKey: "_id",
    properties: {
      _id: "string",
      fecha: "string",
      total_en_sitio: "int",
      reportadas_hoy: "int",
      sin_reportar: "int",
      sin_operar: "int",
      maquinarias: {
        type: "list",
        objectType: "MaquinariaHubItemRealm",
      },
      updatedAt: "date",
    },
  };
}
