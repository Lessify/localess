(function () {
  const FG_YELLOW = "\x1b[33m"
  const RESET = "\x1b[0m"
  const LOG_GROUP = `${FG_YELLOW}[Localess:Sync]${RESET}`
  // Event emitted from Application to Visual Editor
  type EventToEditorType = 'ping' | 'selectSchema' | 'hoverSchema' | 'leaveSchema';
  type EventToEditor =
    | { type: 'ping' }
    | { type: 'selectSchema' | 'hoverSchema' | 'leaveSchema'; id: string; schema: string; field?: string };

  // Event emitted from Visual Editor to Application
  type EventToAppType = 'save' | 'publish' | 'pong' | 'input' | 'change' | 'enterSchema' | 'hoverSchema';
  type EventCallback = (event: EventToApp) => void;
  type EventToApp =
    | { type: 'save' | 'publish' | 'pong' }
    | { type: 'input' | 'change'; data: any }
    | { type: 'enterSchema' | 'hoverSchema'; id: string; schema: string; field?: string };

  function isInIframe() {
    return window.top !== window.self;
  }

  function sendEditorData(data: EventToEditor) {
    console.log(LOG_GROUP,'SyncToEditorEvent', data);
    window.parent.postMessage({ owner: 'LOCALESS', ...data }, '*');
  }

  function createCSS() {
    const style = document.createElement('style');
    style.id = 'localess-css-sync';
    // Highlight Visual Editor Elements
    style.textContent = `
    [data-ll-id],[data-ll-field]{outline: 2px dashed rgba(0,92,187,0.5);transition: box-shadow ease-out 150ms;}
    [data-ll-id]:hover,[data-ll-field]:hover{box-shadow: inset 100vi 100vh rgba(0,92,187,0.1);outline: 2px solid rgba(0,92,187,1);cursor: pointer;}`;
    // Snackbar
    style.textContent += `
    .ll-snackbar-container{position: fixed;bottom: 20px;display: flex;flex-direction: column-reverse;left: 50%;gap: 10px;}
    .ll-snackbar{min-width: 250px;background-color: #333;color: #fff;text-align: center;border-radius: 4px;padding: 16px;transform: translateX(-50%);box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16);animation: ll-fadein 0.5s, ll-fadeout 0.5s 2.5s;}
    @keyframes ll-fadein {from {bottom: 0; opacity: 0;}to {bottom: 30px; opacity: 1;}}@keyframes ll-fadeout {from {bottom: 30px; opacity: 1;}to {bottom: 0; opacity: 0;}}`;
    document.head.appendChild(style);
  }

  function markVisualEditorElements(source: string) {
    console.log(LOG_GROUP,'markVisualEditorElements', source);
    document.querySelectorAll<HTMLElement>('[data-ll-id]:not([data-ll-hook])').forEach(element => {
      const id = element.getAttribute('data-ll-id')!;
      const schema = element.getAttribute('data-ll-schema')!;
      if (element.offsetHeight < 5) {
        element.style.minHeight = '5px';
      }
      element.setAttribute('data-ll-hook', 'true');
      // Schema Events
      element.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        // Send Message with Selected Schema
        sendEditorData({ type: 'selectSchema', id: id, schema: schema });
      });
      element.addEventListener('mouseenter', event => {
        // Send Message with Hover Schema
        sendEditorData({ type: 'hoverSchema', id: id, schema: schema });
      });
      element.addEventListener('mouseleave', event => {
        // Send Message with Leave Schema
        sendEditorData({ type: 'leaveSchema', id: id, schema: schema });
      });
      // Field Events
      element.querySelectorAll<HTMLElement>('[data-ll-field]').forEach(field => {
        const fieldName = field.getAttribute('data-ll-field')!;
        if (field.closest('[data-ll-id]') !== element) return;
        //field.setAttribute('data-ll-hook', 'true');
        field.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          // Send Message with Selected Schema with field
          sendEditorData({ type: 'selectSchema', id: id, schema: schema, field: fieldName });
        });
        field.addEventListener('mouseenter', event => {
          // Send Message with Hover Schema with field
          sendEditorData({ type: 'hoverSchema', id: id, schema: schema, field: fieldName });
        });
        field.addEventListener('mouseleave', event => {
          // Send Message with Leave Schema with field
          sendEditorData({ type: 'leaveSchema', id: id, schema: schema, field: fieldName });
        });
      });
    });
  }

  function addMessageContainer() {
    const snackbarContainer = document.createElement('div');
    snackbarContainer.className = 'll-snackbar-container';
    document.body.appendChild(snackbarContainer);
  }

  function addMessage(message: string) {
    const snackbar = document.createElement('div');
    snackbar.className = 'll-snackbar';
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
      events: Record<EventToAppType, EventCallback[]> = {
        save: [],
        publish: [],
        input: [],
        change: [],
        enterSchema: [],
        hoverSchema: [],
        pong: [],
      };

      constructor() {
        console.log(
          `%c🚀🚀🚀LOCALESS: Sync version ${this.version} initialized🚀🚀🚀`,
          'background: #222; color: #0063EB; font-size: 2rem;',
        );
        addMessageContainer()
        addMessage('Localess: Sync initialized.');
        // Receive message from Visual Editor
        addEventListener('message', event => {
          if (event.origin === location.ancestorOrigins.item(0)) {
            console.log(LOG_GROUP,'EditorToSyncEvent', event.data)
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
              case 'input': {
                this.emit(data);
                setTimeout(() => markVisualEditorElements('input'), 1000);
                break;
              }
              case 'change': {
                this.emit(data);
                setTimeout(() => markVisualEditorElements('change'), 1000);
                break;
              }
              case 'enterSchema': {
                this.emit(data);
                break;
              }
              case 'hoverSchema': {
                this.emit(data);
                break;
              }
              case 'pong': {
                this.emit(data);
                break;
              }
            }
          }
        });
        this.pingEditor()
      }

      emit(event: EventToApp) {
        const cbList = this.events[event.type];
        for (const cb of cbList) {
          cb.apply(this, [event]);
        }
      }

      on(type: EventToAppType | EventToAppType[], callback: EventCallback) {
        if (Array.isArray(type)) {
          for (const e of type) {
            this.addEvent(e, callback);
          }
          addMessage(`Localess: Sync event added [${type.join(', ')}].`);
        } else {
          this.addEvent(type, callback);
          addMessage(`Localess: Sync event added [${type}].`);
        }
      }

      private addEvent(type: EventToAppType, callback: EventCallback) {
        if (this.events[type].indexOf(callback) === -1) {
          this.events[type].push(callback);
        }
      }

      private pingEditor() {
        sendEditorData({ type: 'ping' });
        this.on('pong', this.pingBack)
      }

      private pingBack() {
        this.inEditor = true;
        createCSS();
        markVisualEditorElements('pong');
      }
    }

    (window as any).localess = new Sync();
  }
})();
