(function () {
  const FG_BLUE = '\x1b[34m';
  const RESET = '\x1b[0m';
  const LOG_GROUP = `${FG_BLUE}[Localess:Sync]${RESET}`;
  // Event emitted from Application to Visual Editor
  type EventToEditorType = 'ping' | 'unload' | 'blocks' | 'selectSchema' | 'hoverSchema' | 'leaveSchema' | 'blockAction';
  // Structure changes the editor allows on the selected block, shown in a toolbar on it.
  type BlockAction = 'moveUp' | 'moveDown' | 'duplicate' | 'remove';
  type EventToEditor =
    /**
     * Handshake. `protocol` is bumped whenever the message contract changes; `sdk` is the SDK that
     * loaded the script (its `data-sdk`); `scriptOrigin` is where the script was loaded from.
     */
    | { type: 'ping'; protocol: number; sdk?: string; scriptOrigin?: string }
    // The top-level blocks on the page, roughly one per rendered document, so the editor can tell
    // whether the page shows the document being edited.
    | { type: 'blocks'; ids: string[] }
    // The page is going away (reload or navigation), so the editor waits for the next page's ping.
    | { type: 'unload' }
    // A click in the selected block's toolbar; the editor applies it to the document.
    | { type: 'blockAction'; id: string; action: BlockAction }
    | { type: 'selectSchema' | 'hoverSchema' | 'leaveSchema'; id: string; schema: string; field?: string };

  // Event emitted from Visual Editor to Application
  type EventToAppType = 'save' | 'publish' | 'unpublish' | 'pong' | 'input' | 'change' | 'enterSchema' | 'hoverSchema' | 'leaveSchema';
  type EventCallback = (event: EventToApp) => void;
  type EventToApp =
    | { type: 'save'; documentId: string }
    | { type: 'publish'; documentId: string }
    | { type: 'unpublish'; documentId: string }
    | { type: 'pong' }
    | { type: 'leaveSchema' }
    // `documentId` is the edited document's id; a page rendering several documents applies it only to that one.
    | { type: 'input'; documentId: string; data: any }
    | { type: 'change'; documentId: string; data: any }
    | { type: 'enterSchema'; id: string; schema: string; field?: string; root?: boolean }
    | { type: 'hoverSchema'; id: string; schema: string; field?: string };
  /**
   * Narrows {@link EventToApp} down to the variant(s) matching event type `T`.
   * Used to type {@link LocalessSync.on}'s callback based on the subscribed event(s),
   * e.g. subscribing to `'input' | 'change'` narrows the callback's `event` to the variant with `data`.
   */
  type EventToAppOf<T extends EventToAppType> = Extract<EventToApp, { type: T }>;
  type EventsMap = { [K in EventToAppType]: Array<(event: EventToAppOf<K>) => void> };


  function isInIframe() {
    return window.top !== window.self;
  }

  /** Only set while the script first runs, so everything read from it is read up front. */
  const currentScript = document.currentScript as HTMLScriptElement | null;
  const PROTOCOL = 1;
  /** Set by the SDK loader, e.g. `@localess/react@4.0.3`; absent for a hand-written script tag. */
  const sdk = currentScript?.getAttribute('data-sdk') ?? undefined;
  /** The Localess deployment the script came from, i.e. the SDK's `origin`. */
  const scriptOrigin = originOf(currentScript?.src);

  function originOf(url: string | undefined): string | undefined {
    if (!url) return undefined;
    try {
      return new URL(url).origin;
    } catch {
      return undefined;
    }
  }
  /**
   * Debug mode, enabled with `data-debug` on the script tag (any value but `"false"`); the SDK
   * sets it from the client's `debug` option. Off by default: content editors see the preview,
   * so it only logs one line on connect, plus warnings for real misconfiguration.
   */
  const debug = currentScript?.hasAttribute('data-debug') === true && currentScript.getAttribute('data-debug') !== 'false';

  function log(...args: unknown[]) {
    if (debug) console.log(LOG_GROUP, ...args);
  }

  /**
   * Origin the Visual Editor is expected to post from, resolved once at load.
   *
   * `location.ancestorOrigins` comes first because it is the parent's real origin, which
   * also covers deployments reached through a second domain or a proxy. Firefox does not
   * implement it, so there the script's own origin is used instead: the script is served
   * by the same Localess deployment as the editor (`<origin>/scripts/sync-v1.js`).
   * `undefined` only when the script was inlined without a `src`.
   */
  const expectedEditorOrigin = resolveExpectedEditorOrigin();
  /** Origin of the editor that answered the handshake; every later message is bound to it. */
  let editorOrigin: string | undefined;
  let originMismatchWarned = false;

  function resolveExpectedEditorOrigin(): string | undefined {
    const ancestorOrigin = location.ancestorOrigins?.item(0);
    if (ancestorOrigin && ancestorOrigin !== 'null') {
      return ancestorOrigin;
    }
    return scriptOrigin;
  }

  function sendEditorData(data: EventToEditor) {
    // Only `ping` may go out before the handshake. When the editor origin could not be resolved it
    // falls back to '*', stripped to the bare handshake so it exposes nothing to an unknown parent.
    const targetOrigin = editorOrigin ?? (data.type === 'ping' ? (expectedEditorOrigin ?? '*') : undefined);
    if (!targetOrigin) return;
    const payload: EventToEditor = targetOrigin === '*' && data.type === 'ping' ? { type: 'ping', protocol: PROTOCOL } : data;
    log('SyncToEditorEvent', payload);
    window.parent.postMessage({ owner: 'LOCALESS', ...payload }, targetOrigin);
  }

  /**
   * Accepts a message only from the parent frame, and only from the editor origin. Before the
   * handshake only a `pong` is accepted, and the origin it came from is pinned for the session.
   */
  function isFromEditor(event: MessageEvent): boolean {
    if (event.source !== window.parent) return false;
    if (editorOrigin !== undefined) return event.origin === editorOrigin;
    if ((event.data as EventToApp | undefined)?.type !== 'pong') return false;
    if (expectedEditorOrigin !== undefined && event.origin !== expectedEditorOrigin) {
      if (!originMismatchWarned) {
        originMismatchWarned = true;
        console.warn(
          LOG_GROUP,
          `Ignoring Visual Editor at ${event.origin}: expected ${expectedEditorOrigin}. ` +
            'The Localess origin configured in the SDK must match the address the editor is opened from.',
        );
      }
      return false;
    }
    editorOrigin = event.origin;
    return true;
  }

  function createCSS() {
    const style = document.createElement('style');
    style.id = 'localess-css-sync';
    // Highlight Visual Editor Elements
    style.textContent = `
    [data-ll-id],[data-ll-field]{outline: 2px dashed rgba(0,92,187,0.5);transition: box-shadow ease-out 150ms;}
    [data-ll-id]:hover,[data-ll-field]:hover,.ll-hover-highlight{box-shadow: inset 100vi 100vh rgba(0,92,187,0.1);outline: 2px solid rgba(0,92,187,1);cursor: pointer;}
    [data-ll-id][data-ll-selected]{outline: 3px solid rgba(0,92,187,1);outline-offset: 2px;}`;
    // Snackbar KeyFames
    style.textContent += `
      @keyframes ll-fadein {from {bottom: 0; opacity: 0;}to {bottom: 30px; opacity: 1;}}
      @keyframes ll-fadeout {from {bottom: 30px; opacity: 1;}to {bottom: 0; opacity: 0;}}
    `;
    document.head.appendChild(style);
  }

  let currentHoverHighlightElement: HTMLElement | null = null;

  function clearHoverHighlight() {
    currentHoverHighlightElement?.classList.remove('ll-hover-highlight');
    currentHoverHighlightElement = null;
  }

  function applyHoverHighlight(id: string, field?: string) {
    clearHoverHighlight();
    const idElement = document.querySelector<HTMLElement>(`[data-ll-id="${id}"]`);
    if (!idElement) return;
    const target = field ? (idElement.querySelector<HTMLElement>(`[data-ll-field="${field}"]`) ?? idElement) : idElement;
    target.classList.add('ll-hover-highlight');
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    currentHoverHighlightElement = target;
  }

  /**
   * Id of the schema the editor has entered, kept as an id rather than an element: frameworks
   * re-render or recreate the node, and morphdom-style patchers strip unknown attributes, so
   * {@link markVisualEditorElements} re-applies the mark on every scan.
   */
  let selectedSchemaId: string | undefined;

  function findSchemaElement(id: string) {
    return document.querySelector<HTMLElement>(`[data-ll-id="${CSS.escape(id)}"]`);
  }

  function applySelectedHighlight() {
    const target = selectedSchemaId ? findSchemaElement(selectedSchemaId) : null;
    document.querySelectorAll('[data-ll-selected]').forEach(element => {
      if (element !== target) element.removeAttribute('data-ll-selected');
    });
    if (target && !target.hasAttribute('data-ll-selected')) {
      target.setAttribute('data-ll-selected', 'true');
    }
    updateToolbar(target);
  }

  function selectSchema(id: string | undefined) {
    selectedSchemaId = id;
    applySelectedHighlight();
    if (id) {
      findSchemaElement(id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  const ICON_ATTRIBUTES =
    'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const BLOCK_ACTIONS: Record<BlockAction, { label: string; icon: string }> = {
    moveUp: { label: 'Move up', icon: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>' },
    moveDown: { label: 'Move down', icon: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>' },
    duplicate: {
      label: 'Duplicate',
      icon: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    },
    remove: {
      label: 'Delete',
      icon: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    },
  };
  // How long the delete button waits for its confirming second click.
  const CONFIRM_REMOVE_TIMEOUT = 3000;
  const TOOLBAR_CSS = `
    .bar{display:flex;gap:2px;padding:2px;background:#005cbb;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.3);font:500 12px/1 system-ui,sans-serif;}
    button{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:26px;height:26px;padding:0 5px;border-radius:4px;color:#fff;cursor:pointer;}
    button:hover{background:rgba(255,255,255,.2);}
    button:focus-visible{outline:2px solid #fff;outline-offset:-2px;}
    button.confirm{background:#d92d20;}
    svg{width:16px;height:16px;}`;

  /** The document from the editor's last `input` or `change`; the toolbar's actions are read from it. */
  let editedDocument: unknown;
  /** Actions the selected block allows; empty hides the toolbar. */
  let selectedActions: BlockAction[] = [];

  type Block = { _id: string; [field: string]: unknown };

  function isBlock(value: unknown): value is Block {
    return typeof value === 'object' && value !== null && typeof (value as Block)._id === 'string';
  }

  /**
   * The actions a block allows, from where it sits in the edited document: a block in a list can
   * move, be duplicated and be removed; a block in a single field can only be removed. The root and
   * blocks that aren't in the document get none. The editor checks every action again before it
   * applies it.
   */
  function blockActionsOf(id: string): BlockAction[] {
    const queue: unknown[] = [editedDocument];
    for (let node = queue.shift(); node !== undefined; node = queue.shift()) {
      if (!isBlock(node)) continue;
      for (const value of Object.values(node)) {
        if (isBlock(value)) {
          if (value._id === id) return ['remove'];
          queue.push(value);
        } else if (Array.isArray(value)) {
          const index = value.findIndex(item => isBlock(item) && item._id === id);
          if (index >= 0) {
            const actions: BlockAction[] = [];
            if (index > 0) actions.push('moveUp');
            if (index < value.length - 1) actions.push('moveDown');
            actions.push('duplicate', 'remove');
            return actions;
          }
          queue.push(...value);
        }
      }
    }
    return [];
  }

  function setEditedDocument(data: unknown) {
    editedDocument = data;
    applySelectedHighlight();
  }
  let toolbarHost: HTMLElement | undefined;
  let toolbarBar: HTMLElement | undefined;
  let toolbarTarget: HTMLElement | null = null;
  /** The block and actions the buttons were built for, so a re-scan doesn't rebuild them. */
  let toolbarKey: string | undefined;
  let confirmRemoveTimer: ReturnType<typeof setTimeout> | undefined;
  /** Set after a move or duplicate, so the next scan scrolls the re-rendered block into view. */
  let followSelection = false;

  /**
   * The toolbar lives in a Shadow DOM, so the site's CSS can't restyle it and ours can't leak out.
   * It is attached to `<html>` rather than `<body>`, which frameworks often render into, and kept
   * outside every block so its clicks never reach their listeners.
   */
  function createToolbar() {
    const host = document.createElement('localess-toolbar');
    host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;top:0;left:0;display:none;';
    const root = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = TOOLBAR_CSS;
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Block actions');
    root.append(style, bar);
    bar.addEventListener('click', event => {
      const button = (event.target as Element).closest<HTMLButtonElement>('button');
      if (button) onToolbarAction(button, button.dataset['action'] as BlockAction);
    });
    // The page's own handlers would take these for clicks on the page.
    for (const type of ['click', 'mousedown', 'pointerdown', 'mouseup', 'pointerup']) {
      host.addEventListener(type, event => event.stopPropagation());
    }
    toolbarHost = host;
    toolbarBar = bar;
  }

  function renderToolbarButtons() {
    clearTimeout(confirmRemoveTimer);
    toolbarBar!.replaceChildren(
      ...selectedActions.map(action => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset['action'] = action;
        button.title = BLOCK_ACTIONS[action].label;
        button.setAttribute('aria-label', BLOCK_ACTIONS[action].label);
        button.innerHTML = `<svg ${ICON_ATTRIBUTES}>${BLOCK_ACTIONS[action].icon}</svg>`;
        return button;
      }),
    );
  }

  function onToolbarAction(button: HTMLButtonElement, action: BlockAction) {
    if (!selectedSchemaId || !selectedActions.includes(action)) return;
    // Deleting takes a second click: a slip on the page is easier than in the form.
    if (action === 'remove' && !button.classList.contains('confirm')) {
      button.classList.add('confirm');
      button.append(document.createTextNode('Delete?'));
      button.setAttribute('aria-label', 'Confirm delete');
      confirmRemoveTimer = setTimeout(() => {
        renderToolbarButtons();
        positionToolbar();
      }, CONFIRM_REMOVE_TIMEOUT);
      positionToolbar();
      return;
    }
    clearTimeout(confirmRemoveTimer);
    followSelection = action !== 'remove';
    sendEditorData({ type: 'blockAction', id: selectedSchemaId, action });
  }

  function updateToolbar(target: HTMLElement | null) {
    selectedActions = selectedSchemaId ? blockActionsOf(selectedSchemaId) : [];
    toolbarTarget = selectedActions.length > 0 ? target : null;
    if (!toolbarTarget) {
      if (toolbarHost) toolbarHost.style.display = 'none';
      return;
    }
    if (!toolbarHost) createToolbar();
    // A framework that re-renders the whole document can drop it.
    if (!toolbarHost!.isConnected) document.documentElement.appendChild(toolbarHost!);
    const key = `${selectedSchemaId}|${selectedActions.join(',')}`;
    if (key !== toolbarKey) {
      toolbarKey = key;
      renderToolbarButtons();
    }
    positionToolbar();
  }

  /** Puts the toolbar in the selected block's top-right corner, inside the visible part of the block. */
  function positionToolbar() {
    const host = toolbarHost;
    if (!host || !toolbarTarget) return;
    const rect = toolbarTarget.getBoundingClientRect();
    const inView = rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
    if (!toolbarTarget.isConnected || !inView) {
      host.style.display = 'none';
      return;
    }
    host.style.display = 'block';
    const inset = 6;
    const top = Math.max(rect.top, 0) + inset;
    const left = Math.max(Math.min(rect.right, window.innerWidth) - host.offsetWidth - inset, Math.max(rect.left, 0) + inset, 0);
    host.style.top = `${Math.round(top)}px`;
    host.style.left = `${Math.round(left)}px`;
  }

  let positionScheduled = false;

  function schedulePositionToolbar() {
    if (positionScheduled || !toolbarTarget) return;
    positionScheduled = true;
    requestAnimationFrame(() => {
      positionScheduled = false;
      positionToolbar();
    });
  }

  function followToolbar() {
    addEventListener('scroll', schedulePositionToolbar, { capture: true, passive: true });
    addEventListener('resize', schedulePositionToolbar, { passive: true });
  }

  /**
   * Elements and fields that already carry their listeners.
   *
   * Tracked by node identity rather than by the `data-ll-hook` attribute: DOM-patching
   * live-preview implementations (e.g. morphdom) copy attributes from freshly rendered
   * server HTML onto the *same* node, which strips `data-ll-hook` while leaving the
   * existing listeners attached. Keying off the attribute made every patch stack another
   * set of listeners, so one click emitted N `selectSchema` events. A WeakSet is immune to
   * that, and lets nodes be garbage collected once the framework drops them.
   */
  const hookedElements = new WeakSet<Element>();
  const hookedFields = new WeakSet<Element>();

  function markVisualEditorElements(source: string) {
    let schemas = 0;
    let fields = 0;

    document.querySelectorAll<HTMLElement>('[data-ll-id]').forEach(element => {
      if (hookedElements.has(element)) {
        // Already wired. `data-ll-hook` is only a debug/tooling marker — the WeakSet above is
        // the real guard — but a DOM-patching live preview copies attributes from freshly
        // rendered server HTML onto this same node and strips it, which made the marker claim
        // the element was unhooked while its listeners were very much still attached. Putting
        // it back costs nothing and keeps what is inspectable in devtools honest.
        if (!element.hasAttribute('data-ll-hook')) {
          element.setAttribute('data-ll-hook', 'true');
        }
        return;
      }
      hookedElements.add(element);
      schemas++;
      if (element.offsetHeight < 5) {
        element.style.minHeight = '5px';
      }
      element.setAttribute('data-ll-hook', 'true');
      // `data-ll-id`/`data-ll-schema` are read at event time, not captured here: frameworks
      // bind them as host attributes and rewrite them in place when the content changes, so
      // a captured value would go stale after the first edit.
      const schemaOf = (target: HTMLElement) => ({
        id: target.getAttribute('data-ll-id'),
        schema: target.getAttribute('data-ll-schema'),
      });
      // Schema Events
      element.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const { id, schema } = schemaOf(element);
        if (!id) return;
        // Send Message with Selected Schema
        sendEditorData({ type: 'selectSchema', id: id, schema: schema! });
      });
      element.addEventListener('mouseenter', () => {
        const { id, schema } = schemaOf(element);
        if (!id) return;
        // Send Message with Hover Schema
        sendEditorData({ type: 'hoverSchema', id: id, schema: schema! });
      });
      element.addEventListener('mouseleave', () => {
        const { id, schema } = schemaOf(element);
        if (!id) return;
        // Send Message with Leave Schema
        sendEditorData({ type: 'leaveSchema', id: id, schema: schema! });
      });
    });

    // Fields are scanned independently of their owning schema rather than nested inside the
    // loop above. A DOM patch can add new `[data-ll-field]` children inside an element that
    // is already hooked; nesting the scan would skip those forever.
    document.querySelectorAll<HTMLElement>('[data-ll-field]').forEach(field => {
      if (hookedFields.has(field)) return;
      // Not yet inside a schema element — leave it unhooked so a later scan retries.
      if (!field.closest('[data-ll-id]')) return;
      hookedFields.add(field);
      fields++;
      const fieldTarget = () => {
        const owner = field.closest<HTMLElement>('[data-ll-id]');
        return {
          id: owner?.getAttribute('data-ll-id'),
          schema: owner?.getAttribute('data-ll-schema'),
          field: field.getAttribute('data-ll-field'),
        };
      };
      field.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const { id, schema, field: fieldName } = fieldTarget();
        if (!id) return;
        // Send Message with Selected Schema with field
        sendEditorData({ type: 'selectSchema', id: id, schema: schema!, field: fieldName! });
      });
      field.addEventListener('mouseenter', () => {
        const { id, schema, field: fieldName } = fieldTarget();
        if (!id) return;
        // Send Message with Hover Schema with field
        sendEditorData({ type: 'hoverSchema', id: id, schema: schema!, field: fieldName! });
      });
      field.addEventListener('mouseleave', () => {
        const { id, schema, field: fieldName } = fieldTarget();
        if (!id) return;
        // Send Message with Leave Schema with field
        sendEditorData({ type: 'leaveSchema', id: id, schema: schema!, field: fieldName! });
      });
    });

    applySelectedHighlight();
    if (followSelection && toolbarTarget) {
      followSelection = false;
      toolbarTarget.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    reportBlocks();

    if (schemas > 0 || fields > 0) {
      log('markVisualEditorElements', source, { schemas, fields });
    }
  }

  let reportedBlocks: string | undefined;

  /** Sends the top-level block ids to the editor, only when they changed since the last report. */
  function reportBlocks() {
    const ids = [...document.querySelectorAll<HTMLElement>('[data-ll-id]')]
      .filter(element => !element.parentElement?.closest('[data-ll-id]'))
      .map(element => element.getAttribute('data-ll-id') as string);
    const key = ids.join(',');
    if (key === reportedBlocks) return;
    reportedBlocks = key;
    sendEditorData({ type: 'blocks', ids });
  }

  let elementObserver: MutationObserver | undefined;
  let scanScheduled = false;

  /** Coalesces bursts of mutations into a single scan on the next macrotask. */
  function scheduleMarkVisualEditorElements(source: string) {
    if (scanScheduled) return;
    scanScheduled = true;
    setTimeout(() => {
      scanScheduled = false;
      markVisualEditorElements(source);
    }, 0);
  }

  /**
   * Keeps hooking schema elements as they appear, instead of only at `pong` and 1s after
   * each edit.
   *
   * A one-shot scan silently missed anything created outside those two moments. The case
   * that exposed it: a framework registering schema components lazily resolves the dynamic
   * import while the sync script is still loading, then destroys and recreates the
   * server-rendered nodes — if `pong` landed in that window, those elements stayed unhooked
   * for the rest of the session and clicking them selected nothing.
   *
   * `data-ll-id` is watched as an attribute too, not just as added nodes: frameworks bind it
   * as a host attribute, so it frequently appears on an element that is already in the DOM.
   */
  function observeVisualEditorElements() {
    if (elementObserver) return;
    elementObserver = new MutationObserver(() => scheduleMarkVisualEditorElements('observer'));
    elementObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      // `data-ll-hook` is watched as well as `data-ll-id` so that a DOM patch stripping the
      // marker schedules the scan that puts it back. Without it, a patch that only rewrote
      // text nodes produced no observed mutation at all and the marker stayed missing.
      // This does not feed back on itself: re-adding the attribute schedules one more scan,
      // which finds it present, changes nothing, and ends the chain.
      // `data-ll-selected` is watched for the same reason: a patch that strips it schedules the
      // scan that re-applies it, and re-applying converges the same way.
      attributeFilter: ['data-ll-id', 'data-ll-hook', 'data-ll-selected'],
    });
  }

  function addMessageContainer() {
    const snackbarContainer = document.createElement('div');
    snackbarContainer.className = 'll-snackbar-container';
    snackbarContainer.style = 'position: fixed;bottom: 20px;display: flex;flex-direction: column-reverse;left: 50%;gap: 10px;';
    document.body.appendChild(snackbarContainer);
  }

  /** Snackbar inside the preview. Debug only: content editors are the ones who see it. */
  function addMessage(message: string) {
    if (!debug) return;
    const snackbar = document.createElement('div');
    snackbar.className = 'll-snackbar';
    snackbar.style =
      'min-width: 250px;background-color: #333;color: #fff;text-align: center;border-radius: 4px;padding: 16px;transform: translateX(-50%);box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16);animation: ll-fadein 0.5s, ll-fadeout 0.5s 2.5s;';
    snackbar.textContent = message;
    document.body.querySelector('.ll-snackbar-container')?.appendChild(snackbar);
    setTimeout(() => {
      snackbar.remove();
    }, 3000);
  }

  if (isInIframe()) {
    //createCSS();
    //setTimeout(() => markVisualEditorElements(), 1000);

    class Sync {
      version = 'v1';
      inEditor = false;
      events: EventsMap = {
        save: [],
        publish: [],
        unpublish: [],
        input: [],
        change: [],
        enterSchema: [],
        hoverSchema: [],
        leaveSchema: [],
        pong: [],
      };

      constructor() {
        if (debug) {
          console.log(
            `%c🚀🚀🚀LOCALESS: Sync version ${this.version} initialized🚀🚀🚀`,
            'background: #222; color: #0063EB; font-size: 2rem;',
          );
          addMessageContainer();
        }
        addMessage('Localess: Sync initialized.');
        // Receive message from Visual Editor
        addEventListener('message', event => {
          if (isFromEditor(event)) {
            log('EditorToSyncEvent', event.data);
            const data = event.data as EventToApp;
            switch (data.type) {
              case 'save': {
                this.emit(data);
                break;
              }
              case 'publish': {
                this.emit(data);
                break;
              }
              case 'unpublish': {
                this.emit(data);
                break;
              }
              // `input`/`change` used to re-scan on a 1s timer to catch the re-render.
              // `observeVisualEditorElements()` now hooks new elements as they land, which is
              // both immediate and correct for renders that take longer than a second.
              case 'input': {
                this.emit(data);
                setEditedDocument(data.data);
                break;
              }
              case 'change': {
                this.emit(data);
                setEditedDocument(data.data);
                break;
              }
              case 'enterSchema': {
                this.emit(data);
                // Root is the whole page: outlining it is noise, so entering it clears the selection.
                selectSchema(data.root ? undefined : data.id);
                break;
              }
              case 'hoverSchema': {
                this.emit(data);
                applyHoverHighlight(data.id, data.field);
                break;
              }
              case 'leaveSchema': {
                this.emit(data);
                clearHoverHighlight();
                break;
              }
              case 'pong': {
                this.emit(data);
                break;
              }
            }
          }
        });
        this.pingEditor();
      }

      emit(event: EventToApp) {
        // A copy: a callback that unsubscribes itself would otherwise make the next one get skipped.
        const cbList = [...this.events[event.type]] as EventCallback[];
        for (const cb of cbList) {
          cb.apply(this, [event]);
        }
      }

      /** Subscribes to `input` and `change`. Returns a function that removes the subscription. */
      onChange(callback: (event: EventToAppOf<'change' | 'input'>) => void): () => void {
        return this.on(['input', 'change'], callback);
      }

      /**
       * Subscribes to one or more editor events. Returns a function that removes the subscription.
       * Registering the same callback twice for an event is a no-op, so one removal undoes both.
       */
      on<T extends EventToAppType>(type: T | T[], callback: (event: EventToAppOf<T>) => void): () => void {
        const types = Array.isArray(type) ? type : [type];
        for (const e of types) {
          this.addEvent(e, callback);
        }
        log(`Sync event added [${types.join(', ')}]`);
        return () => this.off(types, callback);
      }

      /** Removes a callback added with {@link on} or {@link onChange}. */
      off<T extends EventToAppType>(type: T | T[], callback: (event: EventToAppOf<T>) => void) {
        const types = Array.isArray(type) ? type : [type];
        for (const e of types) {
          const list = this.events[e];
          const index = list.indexOf(callback);
          if (index !== -1) {
            list.splice(index, 1);
          }
        }
        log(`Sync event removed [${types.join(', ')}]`);
      }

      private addEvent<T extends EventToAppType>(type: T, callback: (event: EventToAppOf<T>) => void) {
        const list = this.events[type];
        if (list.indexOf(callback) === -1) {
          list.push(callback);
        }
      }

      private pingEditor() {
        sendEditorData({ type: 'ping', protocol: PROTOCOL, sdk, scriptOrigin });
        this.on('pong', this.pingBack);
        addEventListener('pagehide', () => sendEditorData({ type: 'unload' }));
      }

      private pingBack() {
        // The editor can pong more than once (e.g. it re-handshakes after reconnecting).
        // Without this guard each pong appended another `<style id="localess-css-sync">`
        // and another snackbar.
        if (this.inEditor) return;
        this.inEditor = true;
        createCSS();
        markVisualEditorElements('pong');
        observeVisualEditorElements();
        followToolbar();
        console.info(LOG_GROUP, `Sync connected to Visual Editor (${editorOrigin})`);
        addMessage('Localess: Sync connected to Visual Editor.');
      }
    }

    (window as any).localess = new Sync();
  }
})();
