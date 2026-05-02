export interface SubmitAvanceResponse {
  id: number,
  concept: number,
  volume: string,
  date: string,
  status: AvanceStatus,
  comments: string
}

export interface SubmitAdvance {
  concept: number,
  volume: number,
  comments: string
}

export enum AvanceStatus {
  "PENDING",
}
