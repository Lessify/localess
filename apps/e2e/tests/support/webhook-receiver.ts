import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface ReceivedRequest {
  headers: IncomingHttpHeaders;
  body: string;
  /** The path and query asked for (`/hook?key=…`). */
  url: string;
}

/**
 * A local HTTP endpoint for webhook deliveries (the server allows loopback URLs with
 * LOCALESS_WEBHOOK_ALLOW_INTERNAL, set in playwright.config.ts). Close it when done.
 */
export class WebhookReceiver {
  readonly requests: ReceivedRequest[] = [];
  /** The status every delivery is answered with (a non-2xx one is logged as a failure). */
  status = 200;
  private constructor(private readonly server: Server) {}

  static async start(): Promise<WebhookReceiver> {
    const requests: ReceivedRequest[] = [];
    let receiver: WebhookReceiver | undefined = undefined;
    const server = createServer((request, response) => {
      const chunks: Buffer[] = [];
      request.on('data', chunk => chunks.push(chunk as Buffer));
      request.on('end', () => {
        requests.push({ headers: request.headers, body: Buffer.concat(chunks).toString('utf8'), url: request.url ?? '' });
        response.writeHead(receiver?.status ?? 200, { 'content-type': 'text/plain' }).end('ok');
      });
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    receiver = new WebhookReceiver(server);
    receiver.requests.push = (...items) => Array.prototype.push.apply(requests, items);
    Object.defineProperty(receiver, 'requests', { get: () => requests });
    return receiver;
  }

  /** The events received, in order. */
  get events(): string[] {
    return this.requests.map(it => String(it.headers['x-webhook-event']));
  }

  get url(): string {
    return `http://127.0.0.1:${(this.server.address() as AddressInfo).port}/hook`;
  }

  async close(): Promise<void> {
    // Keep-alive connections would hold close() open until they time out.
    this.server.closeAllConnections();
    await new Promise<void>(resolve => this.server.close(() => resolve()));
  }
}
