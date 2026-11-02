import Realm from "realm";
import { MaquinariaHubItemRealm } from "./MaquinariaHubItemRealm";

/**
 * El hub de un día, como lo dejó el último refetch con señal.
 *
 * Sin los contadores del servidor desde ADR-009: la barra "N de M
 * reportadas" tiene que contar también lo capturado sin señal, así que la
 * cuenta se hace en el cliente sobre lo fundido con la cola. Guardar la del
 * servidor sería guardar una cifra que la pantalla nunca puede mostrar.
 *
 * `updatedAt` decide cuándo una captura ya enviada deja de pintarse desde la
 * cola: si el hub se escribió después de que la captura se confirmó, el hub
 * ya la trae.
 */
export class MaquinariaHubResponse extends Realm.Object<MaquinariaHubResponse> {
  _id!: string; // "maquinariaHubDiario-{constructionId}-{fecha}"
  fecha!: string;
  maquinarias!: Realm.List<MaquinariaHubItemRealm>;
  updatedAt!: Date;

  static schema: Realm.ObjectSchema = {
    name: "MaquinariaHubResponse",
    primaryKey: "_id",
    properties: {
      _id: "string",
      fecha: "string",
      maquinarias: {
        type: "list",
        objectType: "MaquinariaHubItemRealm",
      },
      updatedAt: "date",
    },
  };
}
