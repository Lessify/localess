import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

/**
 * A customer site for the Visual Editor's preview, on 127.0.0.1 (another origin than the app, as the editor
 * requires). Every path answers `html`; `requests` records the paths asked for. Close it when done.
 */
export class PreviewSite {
  readonly requests: string[] = [];
  private constructor(
    private readonly server: Server,
    private html: string,
  ) {}

  static async start(html = '<!doctype html><title>Preview</title>'): Promise<PreviewSite> {
    let site: PreviewSite | undefined = undefined;
    const server = createServer((request, response) => {
      site?.requests.push(request.url ?? '/');
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(site?.html ?? html);
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    site = new PreviewSite(server, html);
    return site;
  }

  /** The environment URL to configure: `http://127.0.0.1:<port>/`. */
  get url(): string {
    return `http://127.0.0.1:${(this.server.address() as AddressInfo).port}/`;
  }

  serve(html: string): void {
    this.html = html;
  }

  async close(): Promise<void> {
    // Keep-alive connections would hold close() open until they time out.
    this.server.closeAllConnections();
    await new Promise<void>(resolve => this.server.close(() => resolve()));
  }
}

/**
 * A page synced with the editor: the app's sync script, a root block for the document, a title field rendered from
 * the editor's `input` / `change` events.
 */
export function syncedPage(appOrigin: string, document: { id: string; schema: string }, title: string): string {
  return `<!doctype html>
<html><head><title>Preview</title><script src="${appOrigin}/scripts/sync-v1.js"></script></head>
<body>
  <main data-ll-id="${document.id}" data-ll-schema="${document.schema}">
    <h1 id="title" data-ll-field="title">${title}</h1>
  </main>
  <script>
    window.localess?.on(['input', 'change'], event => {
      document.getElementById('title').textContent = event.data?.title ?? '';
    });
  </script>
</body></html>`;
}

/**
 * A synced page that renders the document's `body` blocks (`heading` each) as sections, from the stored data and then
 * from every `input` / `change` (the order and the blocks follow what the editor sends).
 */
export function syncedBlocksPage(
  appOrigin: string,
  document: { id: string; schema: string },
  body: { _id: string; _schema: string; heading?: string }[],
): string {
  return `<!doctype html>
<html><head><title>Preview</title><script src="${appOrigin}/scripts/sync-v1.js"></script></head>
<body>
  <main data-ll-id="${document.id}" data-ll-schema="${document.schema}"><div id="body"></div></main>
  <script>
    function render(blocks) {
      const host = document.getElementById('body');
      host.replaceChildren(...(blocks ?? []).map(block => {
        const section = document.createElement('section');
        section.dataset.llId = block._id;
        section.dataset.llSchema = block._schema;
        section.style.cssText = 'display:block;height:120px;margin:12px;';
        const h2 = document.createElement('h2');
        h2.dataset.llField = 'heading';
        h2.textContent = block.heading ?? '';
        section.append(h2);
        return section;
      }));
    }
    render(${JSON.stringify(body)});
    window.localess?.on(['input', 'change'], event => render(event.data?.body));
  </script>
</body></html>`;
}
