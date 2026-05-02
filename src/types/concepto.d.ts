export interface ConceptoItem {
  id: number;
  catalog: number;
  work_item: number;
  description: string;
  unit: string;
  quantity: string;
  unit_price: string;
  clasification: string;
}

export interface ConceptoApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ConceptoItem[];
}
