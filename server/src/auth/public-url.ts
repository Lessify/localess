import type { FastifyRequest } from 'fastify';
import type { AppConfig } from '../config/config.js';

/** The app's public origin: LOCALESS_PUBLIC_URL, or the request's (trustProxy honours X-Forwarded-*). */
export function publicOrigin(config: AppConfig, request: FastifyRequest): string {
  return config.publicUrl ?? `${request.protocol}://${request.host}`;
}
