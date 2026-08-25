import { AvanceBaseWorkItem } from "./WorkItem";
import { Programa } from "./Programa";

export class AvanceBaseCatalog extends Realm.Object<AvanceBaseCatalog> {
  id!: number;
  name!: string;
  construction_id!: number;
  construction_name!: string;
  work_items!: Realm.List<AvanceBaseWorkItem>;
  // Programa contractual vigente. OPCIONAL a propósito: la ausencia de programa
  // es un estado normal y frecuente —toda obra antes de su primer import— y no
  // un error. El cliente rige por D11: sin dato, el indicador no se renderiza.
  programa!: Programa | null;

  static schema: Realm.ObjectSchema = {
    name: "AvanceBaseCatalog",
    embedded: true,
    properties: {
      id: "int",
      name: "string",
      construction_id: "int",
      construction_name: "string",
      work_items: {
        type: "list",
        objectType: "AvanceBaseWorkItem",
      },
      programa: "Programa?",
    },
  };
}
