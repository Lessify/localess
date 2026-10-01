import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, it, mock } from 'node:test';

import { Window } from 'happy-dom';

// Exercises the built artifact rather than the TypeScript source: `src/scripts/sync-v1.js` is what the
// hosting serves to customer sites. Run `npm run build:script:tsup` after editing `scripts/sync-v1.ts`.
const SCRIPTS_DIRECTORY = fileURLToPath(new URL('../src/scripts', import.meta.url));
const SYNC_SCRIPT = readFileSync(`${SCRIPTS_DIRECTORY}/sync-v1.js`, 'utf8');

/** The Localess deployment serving both the editor and the sync script. */
const LOCALESS_ORIGIN = 'https://localess.test';
const EVIL_ORIGIN = 'https://evil.test';

let windows = [];

afterEach(async () => {
  await Promise.all(windows.map(it => it.happyDOM.close()));
  windows = [];
});

/**
 * Loads the sync script into a fresh customer page framed by a fake Visual Editor.
 *
 * happy-dom has no `location.ancestorOrigins`, so unless `ancestorOrigins` is given this is the
 * Firefox code path. By default the script is loaded from `<LOCALESS_ORIGIN>/scripts/sync-v1.js`,
 * the way the SDK injects it; `inline: true` inlines it without a `src` instead.
 */
async function loadSync({ ancestorOrigins = undefined, inline = false, body = '' } = {}) {
  const window = new Window({
    url: 'https://site.test/',
    settings: {
      enableJavaScriptEvaluation: true,
      suppressInsecureJavaScriptEnvironmentWarning: true,
      fetch: { virtualServers: [{ url: `${LOCALESS_ORIGIN}/scripts/`, directory: SCRIPTS_DIRECTORY }] },
    },
  });
  windows.push(window);
  const parent = { postMessage: mock.fn() };
  Object.defineProperty(window, 'top', { configurable: true, get: () => parent });
  Object.defineProperty(window, 'parent', { configurable: true, get: () => parent });
  if (ancestorOrigins) {
    Object.defineProperty(window.location, 'ancestorOrigins', {
      configurable: true,
      value: { length: ancestorOrigins.length, item: i => ancestorOrigins[i] ?? null },
    });
  }
  window.HTMLElement.prototype.scrollIntoView = () => {};
  mock.method(window.console, 'log', () => {});
  const warn = mock.method(window.console, 'warn', () => {});
  window.document.body.innerHTML = body;

  const script = window.document.createElement('script');
  if (inline) {
    script.textContent = SYNC_SCRIPT;
  } else {
    script.src = `${LOCALESS_ORIGIN}/scripts/sync-v1.js`;
  }
  // Not `waitUntilComplete()`: that also waits out the script's 3s snackbar timers.
  const loaded = inline ? Promise.resolve() : new Promise(resolve => script.addEventListener('load', resolve));
  window.document.head.appendChild(script);
  await loaded;

  const fromEditor = (data, { origin = LOCALESS_ORIGIN, source = parent } = {}) =>
    window.dispatchEvent(new window.MessageEvent('message', { data, origin, source }));
  // Round-tripped through JSON: objects built inside the happy-dom realm fail deepStrictEqual against Node's.
  const posted = () =>
    parent.postMessage.mock.calls.map(call => ({ data: JSON.parse(JSON.stringify(call.arguments[0])), targetOrigin: call.arguments[1] }));
  const flush = () => new Promise(resolve => window.setTimeout(resolve, 0));
  return { window, sync: window.localess, fromEditor, posted, warn, flush };
}

describe('sync-v1 handshake', () => {
  it('connects without location.ancestorOrigins (Firefox), using the script origin', async () => {
    const { sync, fromEditor, posted } = await loadSync();

    assert.deepEqual(posted(), [{ data: { owner: 'LOCALESS', type: 'ping' }, targetOrigin: LOCALESS_ORIGIN }]);
    fromEditor({ type: 'pong' });

    assert.equal(sync.inEditor, true);
  });

  it('prefers location.ancestorOrigins when it differs from the script origin (proxy, second domain)', async () => {
    const editorOrigin = 'https://cms.company.test';
    const { sync, fromEditor, posted } = await loadSync({ ancestorOrigins: [editorOrigin] });

    assert.deepEqual(posted(), [{ data: { owner: 'LOCALESS', type: 'ping' }, targetOrigin: editorOrigin }]);
    fromEditor({ type: 'pong' }, { origin: LOCALESS_ORIGIN });
    assert.equal(sync.inEditor, false);
    fromEditor({ type: 'pong' }, { origin: editorOrigin });

    assert.equal(sync.inEditor, true);
  });

  it('ignores a pong from an unexpected origin and warns once', async () => {
    const { sync, fromEditor, warn } = await loadSync();

    fromEditor({ type: 'pong' }, { origin: EVIL_ORIGIN });
    fromEditor({ type: 'pong' }, { origin: EVIL_ORIGIN });

    assert.equal(sync.inEditor, false);
    assert.equal(warn.mock.callCount(), 1);
    assert.match(warn.mock.calls[0].arguments.join(' '), new RegExp(`${EVIL_ORIGIN}.*${LOCALESS_ORIGIN}`));
  });

  it('ignores messages that do not come from the parent frame', async () => {
    const { sync, fromEditor } = await loadSync();

    fromEditor({ type: 'pong' }, { source: {} });

    assert.equal(sync.inEditor, false);
  });

  it('ignores editor events that arrive before the pong', async () => {
    const { sync, fromEditor } = await loadSync();
    const onSave = mock.fn();
    sync.on('save', onSave);

    fromEditor({ type: 'save' });

    assert.equal(onSave.mock.callCount(), 0);
    assert.equal(sync.inEditor, false);
  });

  it('once connected, only delivers messages from the pinned origin', async () => {
    const { sync, fromEditor } = await loadSync();
    const onSave = mock.fn();
    sync.on('save', onSave);
    fromEditor({ type: 'pong' });

    fromEditor({ type: 'save' }, { origin: EVIL_ORIGIN });
    fromEditor({ type: 'save' }, { source: {} });
    fromEditor({ type: 'save' });

    assert.equal(onSave.mock.callCount(), 1);
  });

  it('falls back to a wildcard ping and pins the first pong when no origin can be resolved', async () => {
    const editorOrigin = 'https://anywhere.test';
    const { sync, fromEditor, posted } = await loadSync({ inline: true });
    const onSave = mock.fn();
    sync.on('save', onSave);

    assert.deepEqual(posted(), [{ data: { owner: 'LOCALESS', type: 'ping' }, targetOrigin: '*' }]);
    fromEditor({ type: 'pong' }, { origin: editorOrigin });
    fromEditor({ type: 'save' }, { origin: EVIL_ORIGIN });
    fromEditor({ type: 'save' }, { origin: editorOrigin });

    assert.equal(sync.inEditor, true);
    assert.equal(onSave.mock.callCount(), 1);
  });
});

describe('sync-v1 outgoing messages', () => {
  const body = '<div data-ll-id="a" data-ll-schema="Hero"><h1 data-ll-field="title">Title</h1></div>';

  it('addresses schema and field events to the pinned origin, never to a wildcard', async () => {
    const { window, fromEditor, posted, flush } = await loadSync({ inline: true, body });
    const editorOrigin = 'https://anywhere.test';
    fromEditor({ type: 'pong' }, { origin: editorOrigin });
    await flush();

    const element = window.document.querySelector('[data-ll-id="a"]');
    const field = window.document.querySelector('[data-ll-field="title"]');
    element.click();
    element.dispatchEvent(new window.MouseEvent('mouseenter'));
    element.dispatchEvent(new window.MouseEvent('mouseleave'));
    field.click();

    const events = posted().slice(1);
    assert.deepEqual(
      events.map(it => it.data.type),
      ['selectSchema', 'hoverSchema', 'leaveSchema', 'selectSchema'],
    );
    assert.deepEqual(events.at(-1).data, { owner: 'LOCALESS', type: 'selectSchema', id: 'a', schema: 'Hero', field: 'title' });
    for (const event of events) {
      assert.equal(event.targetOrigin, editorOrigin);
    }
  });

  it('sends nothing but the ping before the handshake', async () => {
    const { window, posted, flush } = await loadSync({ body });
    await flush();

    window.document.querySelector('[data-ll-id="a"]').click();

    assert.deepEqual(
      posted().map(it => it.data.type),
      ['ping'],
    );
  });
});
