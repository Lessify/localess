(function () {
  function isInIframe() {
    return window.top !== window.self;
  }

  function sendEditorData(data: any) {
    window.parent.postMessage(data, '*');
  }

  if (isInIframe()) {
    document.querySelectorAll<HTMLElement>('[data-ll-id]').forEach(element => {
      element.style.outline = '#003DFF dashed 1px';
      element.style.position = 'relative';
      element.style.display = 'block';
      element.addEventListener('click', event => {
        event.stopPropagation();
        const id = element.getAttribute('data-ll-id');
        if (id) {
          sendEditorData({
            owner: 'LOCALESS',
            id: id,
          });
        }
      });
    });

    type EventType = 'input' | 'change';
    type EventCallback = (event: Event) => void;
    type Event = {type: EventType};

    class Sync {
      version = 'v1';
      events: Record<EventType, EventCallback[]> = {
        input: [],
        change: [],
      };

      constructor() {}

      emit(event: Event) {
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
