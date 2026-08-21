import type { QueryParams } from '@/types';
import type { HttpMethod } from '@/lib/api-client';
import type { MockDatabase } from './seed';

export interface RouteContext {
  params: Record<string, string>;
  query: QueryParams;
  body: unknown;
  db: MockDatabase;
}

export type RouteHandler = (context: RouteContext) => unknown;

export interface Route {
  method: HttpMethod;
  pattern: string;
  handler: RouteHandler;
}

export function route(method: HttpMethod, pattern: string, handler: RouteHandler): Route {
  return { method, pattern, handler };
}

export function matchRoute(
  routes: Route[],
  method: HttpMethod,
  path: string,
): { route: Route; params: Record<string, string> } | null {
  const segments = path.split('/').filter(Boolean);

  for (const candidate of routes) {
    if (candidate.method !== method) continue;
    const patternSegments = candidate.pattern.split('/').filter(Boolean);
    if (patternSegments.length !== segments.length) continue;

    const params: Record<string, string> = {};
    let matched = true;
    for (let i = 0; i < patternSegments.length; i += 1) {
      const patternSegment = patternSegments[i]!;
      const segment = segments[i]!;
      if (patternSegment.startsWith(':')) {
        params[patternSegment.slice(1)] = decodeURIComponent(segment);
      } else if (patternSegment !== segment) {
        matched = false;
        break;
      }
    }
    if (matched) return { route: candidate, params };
  }

  return null;
}
