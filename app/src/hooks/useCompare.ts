import { useState } from 'react';

export interface CompareResult {
  phrase1: string;
  phrase2: string;
  model: string;
  dimensions: number;
  similarity: number;
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
      const params = new URLSearchParams({ phrase1, phrase2, model });
      const response = await fetch(`/api/ComparePhrases?${params}`);

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Request failed with status ${response.status}`);
      }

      const body: ComparePayload = await response.json();
      return normalizeCompareResult(body);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { compare, loading, error };
}
