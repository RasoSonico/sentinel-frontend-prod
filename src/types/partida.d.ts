export interface PartidaItem {
  id: number;
  catalog: number;
  name: string;
}

export interface PartidaApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PartidaItem[];
}
