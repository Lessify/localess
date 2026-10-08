import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ArgumentsHost, Catch, ExceptionFilter, NotFoundException } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { isApiPath } from './static-site.js';

/**
 * Unmatched GET/HEAD requests outside `/api` are client-side routes: answer with index.html.
 * API 404s keep Nest's JSON body.
 */
@Catch(NotFoundException)
export class SpaFallbackFilter implements ExceptionFilter {
  private readonly hasIndex: boolean;

  constructor(private readonly root: string) {
    this.hasIndex = existsSync(join(root, 'index.html'));
  }

  catch(exception: NotFoundException, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();
    if (this.hasIndex && (request.method === 'GET' || request.method === 'HEAD') && !isApiPath(request.url)) {
      void reply.header('cache-control', 'no-cache').sendFile('index.html', this.root);
      return;
    }
    void reply.code(404).send(exception.getResponse());
  }
}
