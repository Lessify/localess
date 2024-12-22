(function () {
  interface EventToEditor {
    owner: string;
    id: string;
  }
  type EventType = 'input' | 'save' | 'publish' | 'change';
  type EventCallback = (event: EventToApp) => void;
  type EventToApp = { type: 'save' | 'publish' } | { type: 'input' | 'change'; data: any };

  function isInIframe() {
    return window.top !== window.self;
  }

  function sendEditorData(data: any) {
    console.log('sendEditorData', data);
    window.parent.postMessage(data, '*');
  }

  function createCSS() {
    const style = document.createElement('style');
    style.id = 'localess-css-sync';
    style.textContent = `
    [data-ll-id] {
      outline: #003DFF dashed 1px;
      display: block;
    }
    `.trim();
    document.head.appendChild(style);
  }

  function markVisualEditorElements() {
    document.querySelectorAll<HTMLElement>('[data-ll-id]').forEach(element => {
      //element.classList.add('localess-outline')
      if (element.offsetHeight < 5) {
        element.style.minHeight = '5px'
      }
      element.addEventListener('click', event => {
        event.stopPropagation();
        const id = element.getAttribute('data-ll-id');
        if (id) {
          sendEditorData({
            owner: 'LOCALESS',
            id: id,
          } satisfies EventToEditor);
        }
      });
    });
  }

  if (isInIframe()) {
    createCSS()
    setTimeout(() => markVisualEditorElements(), 1000);

    class Sync {
      version = 'v1';
      events: Record<EventType, EventCallback[]> = {
        input: [],
        save: [],
        publish: [],
        change: [],
      };

      constructor() {
        console.log(
          `%c🚀🚀🚀LOCALESS: Sync version ${this.version} initialized🚀🚀🚀`,
          'background: #222; color: #0063EB; font-size: 2rem;'
        );
        // Receive message from
        addEventListener('message', event => {
          if (event.origin === location.ancestorOrigins.item(0)) {
            setTimeout(() => markVisualEditorElements(), 1000);
            const data = event.data as EventToApp;
            switch (data.type) {
              case 'input': {
                this.emit(data);
                break;
              }
              case 'save': {
                this.emit(data);
                break;
              }
              case 'publish': {
                this.emit(data);
                break;
              }
              case 'change': {
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

      on(type: EventType | EventType[], callback: EventCallback) {
        if (Array.isArray(type)) {
          for (const e of type) {
            this.addEvent(e, callback);
          }
        } else {
          this.addEvent(type, callback);
        }
      }

      private addEvent(type: EventType, callback: EventCallback) {
        if (this.events[type].indexOf(callback) === -1) {
          this.events[type].push(callback);
        }
      }
    }

    (window as any).localess = new Sync();
  }
})();
