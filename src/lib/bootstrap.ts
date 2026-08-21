import { createHttpTransport, setTransport } from './api-client';

/**
 * Selects the transport for the session.
 *
 * Set VITE_API_MODE=rest and VITE_API_BASE_URL=https://api.example.com/v1 to
 * route every service call at the real backend. No other file changes.
 */
export async function bootstrapApi(): Promise<'mock' | 'http'> {
  const mode = import.meta.env.VITE_API_MODE ?? 'mock';

  if (mode === 'rest') {
    const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
    setTransport(createHttpTransport(baseUrl, () => localStorage.getItem('pssu.token')));
    return 'http';
  }

  const { createMockTransport } = await import('@/mocks/server');
  setTransport(
    createMockTransport({
      latency: [120, 340],
      failureRate: Number(import.meta.env.VITE_MOCK_FAILURE_RATE ?? 0),
    }),
  );
  return 'mock';
}
