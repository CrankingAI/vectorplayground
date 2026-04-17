import { useState } from 'react';

export interface CompareResult {
  phrase1: string;
  phrase2: string;
  model: string;
  dimensions: number;
  similarity: number;
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

      return await response.json();
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
