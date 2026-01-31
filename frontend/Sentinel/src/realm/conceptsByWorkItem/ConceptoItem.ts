import Realm from "realm";

export class ConceptoItemRealm extends Realm.Object<ConceptoItemRealm> {
  id!: number;
  catalog!: number;
  work_item!: number;
  description!: string;
  unit!: string;
  quantity!: string;
  unit_price!: string;
  clasification!: string;

  static schema: Realm.ObjectSchema = {
    name: "ConceptoItemRealm",
    embedded: true,
    properties: {
      id: "int",
      catalog: "int",
      work_item: "int",
      description: "string",
      unit: "string",
      quantity: "string",
      unit_price: "string",
      clasification: "string",
    },
  };
}
