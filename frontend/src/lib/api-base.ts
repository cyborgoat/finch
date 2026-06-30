export function getApiBaseUrl(): string {
  if (import.meta.env.SSR) {
    return process.env.API_BASE_URL ?? "http://localhost:8000"
  }
  return import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"
}
