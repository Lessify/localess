(function () {
  // Event emitted from Application to Visual Editor
  type EventToEditorType = 'selectSchema' | 'hoverSchema' | 'leaveSchema';
  type EventToEditor = { owner: 'LOCALESS'; type: EventToEditorType; id: string; schema: string; field?: string };

  // Event emitted from Visual Editor to Application
  type EventToAppType = 'save' | 'publish' | 'input' | 'change' | 'enterSchema' | 'hoverSchema';
  type EventCallback = (event: EventToApp) => void;
  type EventToApp =
    | { type: 'save' | 'publish' }
    | { type: 'input' | 'change'; data: any }
    | { type: 'enterSchema' | 'hoverSchema'; id: string; schema: string; field?: string };

  function isInIframe() {
    return window.top !== window.self;
  }

  function sendEditorData(data: EventToEditor) {
    console.log('sendEditorData', data);
    window.parent.postMessage(data, '*');
  }

  function createCSS() {
    const style = document.createElement('style');
    style.id = 'localess-css-sync';
    style.textContent = `[data-ll-id],[data-ll-field]{outline: 2px dashed rgba(0,92,187,0.5);transition: box-shadow ease-out 150ms;}[data-ll-id]:hover,[data-ll-field]:hover{box-shadow: inset 100vi 100vh rgba(0,92,187,0.1);outline: 2px solid rgba(0,92,187,1);cursor: pointer;}`;
    document.head.appendChild(style);
  }

  function markVisualEditorElements() {
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
        sendEditorData({ owner: 'LOCALESS', type: 'selectSchema', id: id, schema: schema });
      });
      element.addEventListener('mouseenter', event => {
        // Send Message with Hover Schema
        sendEditorData({ owner: 'LOCALESS', type: 'hoverSchema', id: id, schema: schema });
      });
      element.addEventListener('mouseleave', event => {
        // Send Message with Leave Schema
        sendEditorData({ owner: 'LOCALESS', type: 'leaveSchema', id: id, schema: schema });
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
          sendEditorData({ owner: 'LOCALESS', type: 'selectSchema', id: id, schema: schema, field: fieldName });
        });
        field.addEventListener('mouseenter', event => {
          // Send Message with Hover Schema with field
          sendEditorData({ owner: 'LOCALESS', type: 'hoverSchema', id: id, schema: schema, field: fieldName });
        });
        field.addEventListener('mouseleave', event => {
          // Send Message with Leave Schema with field
          sendEditorData({ owner: 'LOCALESS', type: 'leaveSchema', id: id, schema: schema, field: fieldName });
        });
      });
    });
  }

  if (isInIframe()) {
    createCSS();
    setTimeout(() => markVisualEditorElements(), 1000);

    class Sync {
      version = 'v1';
      events: Record<EventToAppType, EventCallback[]> = {
        save: [],
        publish: [],
        input: [],
        change: [],
        enterSchema: [],
        hoverSchema: [],
      };

      constructor() {
        console.log(
          `%c🚀🚀🚀LOCALESS: Sync version ${this.version} initialized🚀🚀🚀`,
          'background: #222; color: #0063EB; font-size: 2rem;',
        );
        // Receive message from Visual Editor
        addEventListener('message', event => {
          if (event.origin === location.ancestorOrigins.item(0)) {
            setTimeout(() => markVisualEditorElements(), 1000);
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
                break;
              }
              case 'change': {
                this.emit(data);
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
            }
          }
        });
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
        } else {
          this.addEvent(type, callback);
        }
      }

      private addEvent(type: EventToAppType, callback: EventCallback) {
        if (this.events[type].indexOf(callback) === -1) {
          this.events[type].push(callback);
        }
      }
    }

    (window as any).localess = new Sync();
  }
})();
