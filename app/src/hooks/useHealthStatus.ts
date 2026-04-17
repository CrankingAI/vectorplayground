import { useEffect, useState } from 'react';

interface ReadinessResponse {
  status: string;
  version: string;
  modelsConfigured: number;
  models: string[];
  probeDimensions: number;
  Status?: string;
  Version?: string;
  ModelsConfigured?: number;
  Models?: string[];
  ProbeDimensions?: number;
}

interface HealthStatus {
  isHealthy: boolean;
  isLoading: boolean;
  version?: string;
  modelsConfigured?: number;
}

export function useHealthStatus(): HealthStatus {
  const [status, setStatus] = useState<HealthStatus>({ isHealthy: false, isLoading: true });

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch('/api/readyz');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ReadinessResponse = await res.json();
        const readinessStatus = data.status ?? data.Status ?? 'unavailable';
        const version = data.version ?? data.Version;
        const modelsConfigured = data.modelsConfigured ?? data.ModelsConfigured;
        if (!cancelled) {
          setStatus({
            isHealthy: readinessStatus === 'ready',
            isLoading: false,
            version,
            modelsConfigured,
          });
        }
      } catch {
        if (!cancelled) {
          setStatus({ isHealthy: false, isLoading: false });
        }
      }
    };

    check();
    const interval = setInterval(check, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return status;
}
