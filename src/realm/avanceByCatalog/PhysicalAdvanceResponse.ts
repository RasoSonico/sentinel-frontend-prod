import Realm from "realm";

export class PhysicalAdvanceResponse extends Realm.Object<PhysicalAdvanceResponse> {
  id!: number;
  concept!: number; // compat
  volume!: string;
  date!: string;
  status!: "PENDING" | "APPROVED" | "REJECTED";
  comments!: string | null;

  concept_id?: number;
  concept_description?: string;
  concept_unit?: string;
  concept_quantity?: string;
  concept_unit_price?: string;
  concept_classification?: string;
  work_item_id?: number;
  work_item_name?: string;
  catalog_id?: number;
  catalog_name?: string;
  construction_id?: number;
  construction_name?: string;
  total_amount?: string;

  static schema: Realm.ObjectSchema = {
    name: "PhysicalAdvanceResponse",
    embedded: true,
    properties: {
      id: "int",
      concept: "int",
      volume: "string",
      date: "string",
      status: "string", // validate at TS-level; Realm stores as string
      comments: "string?",

      concept_id: "int?",
      concept_description: "string?",
      concept_unit: "string?",
      concept_quantity: "string?",
      concept_unit_price: "string?",
      concept_classification: "string?",
      work_item_id: "int?",
      work_item_name: "string?",
      catalog_id: "int?",
      catalog_name: "string?",
      construction_id: "int?",
      construction_name: "string?",
      total_amount: "string?",
    },
  };
}
