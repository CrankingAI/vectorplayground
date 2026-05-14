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

export type SimilarityColor = 'success' | 'warning' | 'error' | 'info';

interface Threshold {
  min: number;
  label: string;
  color: SimilarityColor;
}

const V3_THRESHOLDS: Threshold[] = [
  { min: 0.9, label: 'Nearly identical', color: 'success' },
  { min: 0.7, label: 'Very similar', color: 'success' },
  { min: 0.5, label: 'Somewhat similar', color: 'info' },
  { min: 0.3, label: 'Loosely related', color: 'warning' },
];

// Ada 002 is anisotropic: unrelated pairs cluster around 0.70-0.80, so the
// thresholds are shifted up to keep label semantics consistent across models.
const ADA_THRESHOLDS: Threshold[] = [
  { min: 0.95, label: 'Nearly identical', color: 'success' },
  { min: 0.88, label: 'Very similar', color: 'success' },
  { min: 0.82, label: 'Somewhat similar', color: 'info' },
  { min: 0.77, label: 'Loosely related', color: 'warning' },
];

const NOT_SIMILAR: { label: string; color: SimilarityColor } = {
  label: 'Not very similar',
  color: 'error',
};

export function getSimilarityInfo(score: number, modelId: string): { label: string; color: SimilarityColor } {
  const table = modelId === 'text-embedding-ada-002' ? ADA_THRESHOLDS : V3_THRESHOLDS;
  for (const t of table) {
    if (score >= t.min) return { label: t.label, color: t.color };
  }
  return NOT_SIMILAR;
}

