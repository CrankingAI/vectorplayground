import { useEffect, useState } from 'react';

interface ReadinessResponse {
  status: string;
  version: string;
  modelsConfigured: number;
  models: string[];
  probeDimensions: number;
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
        if (!cancelled) {
          setStatus({
            isHealthy: data.status === 'ready',
            isLoading: false,
            version: data.version,
            modelsConfigured: data.modelsConfigured,
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
