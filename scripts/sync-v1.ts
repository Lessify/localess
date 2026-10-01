(function () {
  const FG_BLUE = '\x1b[34m';
  const RESET = '\x1b[0m';
  const LOG_GROUP = `${FG_BLUE}[Localess:Sync]${RESET}`;
  // Event emitted from Application to Visual Editor
  type EventToEditorType = 'ping' | 'selectSchema' | 'hoverSchema' | 'leaveSchema';
  type EventToEditor =
    | { type: 'ping' }
    | { type: 'selectSchema' | 'hoverSchema' | 'leaveSchema'; id: string; schema: string; field?: string };

  // Event emitted from Visual Editor to Application
  type EventToAppType = 'save' | 'publish' | 'unpublish' | 'pong' | 'input' | 'change' | 'enterSchema' | 'hoverSchema' | 'leaveSchema';
  type EventCallback = (event: EventToApp) => void;
  type EventToApp =
    | { type: 'save' }
    | { type: 'publish' }
    | { type: 'unpublish' }
    | { type: 'pong' }
    | { type: 'leaveSchema' }
    | { type: 'input'; data: any }
    | { type: 'change'; data: any }
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
    const src = currentScript?.src;
    if (src) {
      try {
        return new URL(src).origin;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  function sendEditorData(data: EventToEditor) {
    // Only `ping` may go out before the handshake. It carries no data, so falling back to
    // '*' when the editor origin could not be resolved exposes nothing.
    const targetOrigin = editorOrigin ?? (data.type === 'ping' ? (expectedEditorOrigin ?? '*') : undefined);
    if (!targetOrigin) return;
    log('SyncToEditorEvent', data);
    window.parent.postMessage({ owner: 'LOCALESS', ...data }, targetOrigin);
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
  }

  function selectSchema(id: string | undefined) {
    selectedSchemaId = id;
    applySelectedHighlight();
    if (id) {
      findSchemaElement(id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
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

    if (schemas > 0 || fields > 0) {
      log('markVisualEditorElements', source, { schemas, fields });
    }
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
                break;
              }
              case 'change': {
                this.emit(data);
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
        sendEditorData({ type: 'ping' });
        this.on('pong', this.pingBack);
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
        console.info(LOG_GROUP, `Sync connected to Visual Editor (${editorOrigin})`);
        addMessage('Localess: Sync connected to Visual Editor.');
      }
    }

    (window as any).localess = new Sync();
  }
})();
