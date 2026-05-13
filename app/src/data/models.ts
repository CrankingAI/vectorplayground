export interface EmbeddingModel {
  id: string;
  label: string;
  dimensions: number;
  note: string;
}

export const MODELS: EmbeddingModel[] = [
  { id: 'text-embedding-ada-002', label: 'Ada 002', dimensions: 1536, note: 'Legacy' },
  { id: 'text-embedding-3-small', label: 'Embedding 3 Small', dimensions: 1536, note: 'Cost-effective' },
  { id: 'text-embedding-3-large', label: 'Embedding 3 Large', dimensions: 3072, note: 'Most capable' },
];

export const ALL_MODEL_IDS = MODELS.map((m) => m.id);

export function getModelLabel(id: string): string {
  return MODELS.find((m) => m.id === id)?.label ?? id;
}
