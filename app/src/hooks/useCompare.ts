import { useState } from 'react';
import { API_BASE_URL } from '../config';

export interface CompareResult {
  phrase1: string;
  phrase2: string;
  model: string;
  dimensions: number;
  similarity: number;
}

export interface ModelComparison {
  model: string;
  similarity?: number;
  dimensions?: number;
  error?: string;
}

export interface MultiModelResult {
  phrase1: string;
  phrase2: string;
  perModel: ModelComparison[];
}

type ComparePayload = CompareResult & {
  Phrase1?: string;
  Phrase2?: string;
  Model?: string;
  Dimensions?: number;
  Similarity?: number;
};

function normalizeCompareResult(data: ComparePayload): CompareResult {
  return {
    phrase1: data.phrase1 ?? data.Phrase1 ?? '',
    phrase2: data.phrase2 ?? data.Phrase2 ?? '',
    model: data.model ?? data.Model ?? '',
    dimensions: data.dimensions ?? data.Dimensions ?? 0,
    similarity: data.similarity ?? data.Similarity ?? 0,
  };
}

async function fetchCompare(phrase1: string, phrase2: string, model: string): Promise<CompareResult> {
  const params = new URLSearchParams({ phrase1, phrase2, model });
  const response = await fetch(`${API_BASE_URL}/ComparePhrases?${params}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with status ${response.status}`);
  }
  const body: ComparePayload = await response.json();
  return normalizeCompareResult(body);
}

export function useCompare() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compare = async (
    phrase1: string,
    phrase2: string,
    model: string,
  ): Promise<CompareResult | null> => {
    setLoading(true);
    setError(null);
    try {
      return await fetchCompare(phrase1, phrase2, model);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const compareAcrossModels = async (
    phrase1: string,
    phrase2: string,
    models: string[],
  ): Promise<MultiModelResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const settled = await Promise.allSettled(
        models.map((m) => fetchCompare(phrase1, phrase2, m)),
      );
      const perModel: ModelComparison[] = settled.map((res, i) => {
        if (res.status === 'fulfilled') {
          return {
            model: res.value.model || models[i],
            similarity: res.value.similarity,
            dimensions: res.value.dimensions,
          };
        }
        const reason = res.reason;
        return {
          model: models[i],
          error: reason instanceof Error ? reason.message : String(reason),
        };
      });
      if (perModel.every((m) => m.error !== undefined)) {
        setError(perModel[0]?.error ?? 'All model comparisons failed');
        return null;
      }
      return { phrase1, phrase2, perModel };
    } finally {
      setLoading(false);
    }
  };

  return { compare, compareAcrossModels, loading, error };
}
