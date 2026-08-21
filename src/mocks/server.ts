import type { ApiRequest, Transport } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { createDatabase, type MockDatabase } from './seed';
import { matchRoute, type Route } from './router';
import { accountingRoutes } from './handlers/accounting';
import { salesRoutes } from './handlers/sales';
import { purchaseRoutes } from './handlers/purchase';
import { cashBankRoutes } from './handlers/cash-bank';
import { expenseRoutes } from './handlers/expenses';
import { administrationRoutes } from './handlers/administration';
import { reportRoutes } from './handlers/reports';
import { dashboardRoutes } from './handlers/dashboard';

const routes: Route[] = [
  ...dashboardRoutes,
  ...accountingRoutes,
  ...salesRoutes,
  ...purchaseRoutes,
  ...cashBankRoutes,
  ...expenseRoutes,
  ...reportRoutes,
  ...administrationRoutes,
];

let database: MockDatabase | null = null;

export function getDatabase(): MockDatabase {
  if (!database) database = createDatabase();
  return database;
}

export function resetDatabase(): void {
  database = createDatabase();
}

export interface MockTransportOptions {
  /** Artificial latency range in milliseconds, so loading states are exercised. */
  latency?: [number, number];
  /** Probability that a read fails, used to demonstrate error states. */
  failureRate?: number;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new ApiError(0, 'Permintaan dibatalkan', 'ABORTED'));
      },
      { once: true },
    );
  });
}

export function createMockTransport(options: MockTransportOptions = {}): Transport {
  const [minLatency, maxLatency] = options.latency ?? [140, 380];
  const failureRate = options.failureRate ?? 0;

  return {
    name: 'mock',
    async request<T>({ method, path, params, body, signal }: ApiRequest): Promise<T> {
      await wait(Math.floor(Math.random() * (maxLatency - minLatency)) + minLatency, signal);

      if (failureRate > 0 && method === 'GET' && Math.random() < failureRate) {
        throw new ApiError(503, 'Layanan sedang tidak tersedia. Silakan coba lagi.', 'SERVICE_UNAVAILABLE');
      }

      const matched = matchRoute(routes, method, path);
      if (!matched) {
        throw new ApiError(404, `Endpoint tidak ditemukan: ${method} ${path}`, 'ROUTE_NOT_FOUND');
      }

      const result = matched.route.handler({
        params: matched.params,
        query: params ?? {},
        body,
        db: getDatabase(),
      });

      // Structured clone keeps the UI from mutating the in-memory database by reference.
      return structuredClone(result) as T;
    },
  };
}
