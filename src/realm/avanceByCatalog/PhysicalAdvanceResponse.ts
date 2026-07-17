import Realm from "realm";
import { AdvancePhoto } from "./Photo";

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
  concept_wbs_code?: string;
  concept_section_name?: string;
  work_item_id?: number;
  work_item_name?: string;
  catalog_id?: number;
  catalog_name?: string;
  construction_id?: number;
  construction_name?: string;
  total_amount?: string;
  photo_count?: number;
  // Declarado como arreglo (no Realm.List) para compatibilidad estructural
  // con la interfaz PhysicalAdvanceResponse de src/types/entities; en
  // runtime Realm lo materializa como List igualmente
  photos?: AdvancePhoto[];

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
      concept_wbs_code: "string?",
      concept_section_name: "string?",
      work_item_id: "int?",
      work_item_name: "string?",
      catalog_id: "int?",
      catalog_name: "string?",
      construction_id: "int?",
      construction_name: "string?",
      total_amount: "string?",
      photo_count: "int?",
      photos: "AdvancePhoto[]",
    },
  };
}
