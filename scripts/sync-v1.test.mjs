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
async function loadSync({ ancestorOrigins = undefined, inline = false, debug = undefined, body = '' } = {}) {
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
  const scrollIntoView = mock.fn();
  window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
  const log = mock.method(window.console, 'log', () => {});
  const info = mock.method(window.console, 'info', () => {});
  const warn = mock.method(window.console, 'warn', () => {});
  window.document.body.innerHTML = body;

  const script = window.document.createElement('script');
  if (debug !== undefined) script.setAttribute('data-debug', debug);
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
  const snackbars = () => [...window.document.querySelectorAll('.ll-snackbar')].map(it => it.textContent);
  return { window, sync: window.localess, fromEditor, posted, log, info, warn, flush, scrollIntoView, snackbars };
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

    fromEditor({ type: 'save', documentId: 'doc-1' });

    assert.equal(onSave.mock.callCount(), 0);
    assert.equal(sync.inEditor, false);
  });

  it('once connected, only delivers messages from the pinned origin', async () => {
    const { sync, fromEditor } = await loadSync();
    const onSave = mock.fn();
    sync.on('save', onSave);
    fromEditor({ type: 'pong' });

    fromEditor({ type: 'save', documentId: 'doc-1' }, { origin: EVIL_ORIGIN });
    fromEditor({ type: 'save', documentId: 'doc-1' }, { source: {} });
    fromEditor({ type: 'save', documentId: 'doc-1' });

    assert.equal(onSave.mock.callCount(), 1);
  });

  it('falls back to a wildcard ping and pins the first pong when no origin can be resolved', async () => {
    const editorOrigin = 'https://anywhere.test';
    const { sync, fromEditor, posted } = await loadSync({ inline: true });
    const onSave = mock.fn();
    sync.on('save', onSave);

    assert.deepEqual(posted(), [{ data: { owner: 'LOCALESS', type: 'ping' }, targetOrigin: '*' }]);
    fromEditor({ type: 'pong' }, { origin: editorOrigin });
    fromEditor({ type: 'save', documentId: 'doc-1' }, { origin: EVIL_ORIGIN });
    fromEditor({ type: 'save', documentId: 'doc-1' }, { origin: editorOrigin });

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

describe('sync-v1 enterSchema selection', () => {
  const body = '<main data-ll-id="root" data-ll-schema="Page"><div data-ll-id="a" data-ll-schema="Hero"></div><div data-ll-id="b" data-ll-schema="Card"></div></main>';

  async function connected() {
    const loaded = await loadSync({ body });
    loaded.fromEditor({ type: 'pong' });
    await loaded.flush();
    const selected = () => [...loaded.window.document.querySelectorAll('[data-ll-selected]')].map(it => it.getAttribute('data-ll-id'));
    const enter = (id, extra = {}) => loaded.fromEditor({ type: 'enterSchema', id, schema: 'Any', ...extra });
    return { ...loaded, selected, enter };
  }

  it('marks the entered schema and moves the mark to the next one', async () => {
    const { selected, enter } = await connected();

    enter('a');
    assert.deepEqual(selected(), ['a']);
    enter('b');
    assert.deepEqual(selected(), ['b']);
  });

  it('scrolls the entered schema into view only as far as needed', async () => {
    const { enter, scrollIntoView, window } = await connected();

    enter('a');

    assert.equal(scrollIntoView.mock.callCount(), 1);
    assert.equal(scrollIntoView.mock.calls[0].this, window.document.querySelector('[data-ll-id="a"]'));
    assert.deepEqual(JSON.parse(JSON.stringify(scrollIntoView.mock.calls[0].arguments[0])), { block: 'nearest', behavior: 'smooth' });
  });

  it('clears the mark when entering the root, instead of outlining the page', async () => {
    const { selected, enter, scrollIntoView } = await connected();
    enter('a');

    enter('root', { root: true });

    assert.deepEqual(selected(), []);
    assert.equal(scrollIntoView.mock.callCount(), 1);
  });

  it('clears the mark when the entered schema is not on the page', async () => {
    const { selected, enter } = await connected();
    enter('a');

    enter('missing');

    assert.deepEqual(selected(), []);
  });

  it('re-applies the mark after a re-render strips the attribute', async () => {
    const { selected, enter, window, flush } = await connected();
    enter('a');

    window.document.querySelector('[data-ll-id="a"]').removeAttribute('data-ll-selected');
    await flush();
    await flush();

    assert.deepEqual(selected(), ['a']);
  });

  it('re-applies the mark after the element is replaced by a new node with the same id', async () => {
    const { selected, enter, window, flush } = await connected();
    enter('a');

    const replacement = window.document.createElement('div');
    replacement.setAttribute('data-ll-id', 'a');
    window.document.querySelector('[data-ll-id="a"]').replaceWith(replacement);
    await flush();
    await flush();

    assert.deepEqual(selected(), ['a']);
    assert.equal(window.document.querySelector('[data-ll-selected]'), replacement);
  });
});

describe('sync-v1 debug mode', () => {
  it('is quiet by default: no snackbars, no logs, one info line on connect', async () => {
    const { sync, fromEditor, log, info, snackbars } = await loadSync();
    sync.on('save', () => {});

    fromEditor({ type: 'pong' });
    fromEditor({ type: 'input', documentId: 'doc-1', data: { title: 'Hello' } });

    assert.deepEqual(snackbars(), []);
    assert.equal(log.mock.callCount(), 0);
    assert.equal(info.mock.callCount(), 1);
    assert.match(info.mock.calls[0].arguments.join(' '), new RegExp(`Sync connected to Visual Editor \\(${LOCALESS_ORIGIN}\\)`));
  });

  it('is quiet with data-debug="false"', async () => {
    const { fromEditor, log, snackbars } = await loadSync({ debug: 'false' });

    fromEditor({ type: 'pong' });

    assert.deepEqual(snackbars(), []);
    assert.equal(log.mock.callCount(), 0);
  });

  for (const debug of ['', 'true']) {
    it(`shows the initialized and connected snackbars and logs everything else with data-debug="${debug}"`, async () => {
      const { sync, fromEditor, log, info, snackbars } = await loadSync({ debug });
      sync.on('save', () => {});

      fromEditor({ type: 'pong' });
      fromEditor({ type: 'input', documentId: 'doc-1', data: { title: 'Hello' } });

      assert.deepEqual(snackbars(), ['Localess: Sync initialized.', 'Localess: Sync connected to Visual Editor.']);
      const logged = log.mock.calls.map(call => call.arguments.join(' '));
      assert.ok(logged.some(it => it.includes('Sync event added [save]')));
      assert.ok(logged.some(it => it.includes('EditorToSyncEvent')));
      assert.ok(logged.some(it => it.includes('SyncToEditorEvent')));
      assert.equal(info.mock.callCount(), 1);
    });
  }
});

describe('sync-v1 subscriptions', () => {
  async function connected() {
    const loaded = await loadSync();
    loaded.fromEditor({ type: 'pong' });
    return loaded;
  }

  it('on() returns a function that removes the subscription', async () => {
    const { sync, fromEditor } = await connected();
    const onSave = mock.fn();

    const unsubscribe = sync.on('save', onSave);
    fromEditor({ type: 'save', documentId: 'doc-1' });
    unsubscribe();
    fromEditor({ type: 'save', documentId: 'doc-1' });

    assert.equal(onSave.mock.callCount(), 1);
  });

  it('passes documentId through to subscribers unchanged', async () => {
    const { sync, fromEditor } = await connected();
    const onChange = mock.fn();
    const onSave = mock.fn();
    sync.onChange(onChange);
    sync.on('save', onSave);

    fromEditor({ type: 'input', documentId: 'doc-1', data: { a: 1 } });
    fromEditor({ type: 'save', documentId: 'doc-1' });

    assert.deepEqual(JSON.parse(JSON.stringify(onChange.mock.calls[0].arguments[0])), {
      type: 'input',
      documentId: 'doc-1',
      data: { a: 1 },
    });
    assert.equal(onSave.mock.calls[0].arguments[0].documentId, 'doc-1');
  });

  it('onChange() returns a function that removes both input and change', async () => {
    const { sync, fromEditor } = await connected();
    const onChange = mock.fn();

    const unsubscribe = sync.onChange(onChange);
    fromEditor({ type: 'input', documentId: 'doc-1', data: { a: 1 } });
    unsubscribe();
    fromEditor({ type: 'input', documentId: 'doc-1', data: { a: 2 } });
    fromEditor({ type: 'change', documentId: 'doc-1', data: { a: 3 } });

    assert.equal(onChange.mock.callCount(), 1);
  });

  it('off() removes a callback from every listed event', async () => {
    const { sync, fromEditor } = await connected();
    const callback = mock.fn();

    sync.on(['save', 'publish'], callback);
    sync.off(['save', 'publish'], callback);
    fromEditor({ type: 'save', documentId: 'doc-1' });
    fromEditor({ type: 'publish', documentId: 'doc-1' });

    assert.equal(callback.mock.callCount(), 0);
  });

  it('off() leaves other callbacks for the same event in place', async () => {
    const { sync, fromEditor } = await connected();
    const removed = mock.fn();
    const kept = mock.fn();

    sync.on('save', removed);
    sync.on('save', kept);
    sync.off('save', removed);
    fromEditor({ type: 'save', documentId: 'doc-1' });

    assert.equal(removed.mock.callCount(), 0);
    assert.equal(kept.mock.callCount(), 1);
  });

  it('a callback unsubscribing itself does not make the next one get skipped', async () => {
    const { sync, fromEditor } = await connected();
    const second = mock.fn();
    const unsubscribe = sync.on('save', () => unsubscribe());
    sync.on('save', second);

    fromEditor({ type: 'save', documentId: 'doc-1' });

    assert.equal(second.mock.callCount(), 1);
  });
});
