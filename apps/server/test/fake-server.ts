import { createServer, IncomingMessage, Server } from 'node:http';
import { AddressInfo } from 'node:net';

/** A local HTTP server recording requests and answering with `respond`. */
export async function fakeServer(
  respond: (request: IncomingMessage) => { status: number; body: unknown; headers?: Record<string, string> },
) {
  const requests: { url: string; headers: IncomingMessage['headers']; body: string }[] = [];
  const server: Server = createServer((request, response) => {
    let body = '';
    request.on('data', chunk => (body += chunk));
    request.on('end', () => {
      requests.push({ url: request.url ?? '', headers: request.headers, body });
      const answer = respond(request);
      response.writeHead(answer.status, { 'content-type': 'application/json', ...answer.headers }).end(JSON.stringify(answer.body));
    });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    requests,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}
