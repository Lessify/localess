(function() {
  // Event emitted to Visual Editor
  type EventToEditorType = 'selectSchema' | 'hoverSchema' | 'leaveSchema';
  type EventToEditor = { owner: 'LOCALESS'; type: EventToEditorType; id: string; }

  // Event emitted by Visual Editor
  type EventToAppType = 'save' | 'publish' | 'input' | 'change' | 'enterSchema' | 'hoverSchema';
  type EventCallback = (event: EventToApp) => void;
  type EventToApp =
    { type: 'save' | 'publish' } |
    { type: 'input' | 'change'; data: any } |
    { type: 'enterSchema' | 'hoverSchema', id: string };

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
    style.textContent = `[data-ll-id]{outline:#74777f dashed 1px;display:block;}[data-ll-id]:hover{outline-style:solid;outline-color:#005cbb;}`;
    document.head.appendChild(style);
  }

  function markVisualEditorElements() {
    document.querySelectorAll<HTMLElement>('[data-ll-id]').forEach(element => {
      const id = element.getAttribute('data-ll-id')!;
      if (element.offsetHeight < 5) {
        element.style.minHeight = '5px';
      }
      element.addEventListener('click', event => {
        event.stopPropagation();
        // Send Message with Selected Schema
        sendEditorData({ owner: 'LOCALESS', type: 'selectSchema', id: id });
      });
      element.addEventListener('mouseenter', event => {
        // Send Message with Hover Schema
        sendEditorData({ owner: 'LOCALESS', type: 'hoverSchema', id: id });
        // TODO Create Overlay
      });
      element.addEventListener('mouseleave', event => {
        // Send Message with Leave Schema
        sendEditorData({ owner: 'LOCALESS', type: 'leaveSchema', id: id });
        // TODO Remove Overlay
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
