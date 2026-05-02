export interface CatalogoItem {
  id: number;
  construction: number | null;
  name: string;
  creation_date: string; // ISO date string
  is_active: boolean;
  reason_of_change: string;
}

export interface CatalogoApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CatalogoItem[];
}
