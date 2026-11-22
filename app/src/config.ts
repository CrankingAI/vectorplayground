export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/** Browser telemetry target. Unset (local dev, forks) disables analytics. */
export const APPLICATIONINSIGHTS_CONNECTION_STRING =
  import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING || undefined;
