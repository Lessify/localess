"use strict";
(function () {
    function isInIframe() {
        return window.top !== window.self;
    }
    function sendEditorData(data) {
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
        document.querySelectorAll('[data-ll-id]').forEach(element => {
            //element.classList.add('localess-outline')
            if (element.offsetHeight < 5) {
                element.style.minHeight = '5px';
            }
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
    }
    if (isInIframe()) {
        createCSS();
        setTimeout(() => markVisualEditorElements(), 1000);
        class Sync {
            constructor() {
                this.version = 'v1';
                this.events = {
                    input: [],
                    save: [],
                    publish: [],
                    change: [],
                };
                console.log(`%c🚀🚀🚀LOCALESS: Sync version ${this.version} initialized🚀🚀🚀`, 'background: #222; color: #0063EB; font-size: 2rem;');
                // Receive message from
                addEventListener('message', event => {
                    if (event.origin === location.ancestorOrigins.item(0)) {
                        setTimeout(() => markVisualEditorElements(), 1000);
                        const data = event.data;
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
            emit(event) {
                const cbList = this.events[event.type];
                for (const cb of cbList) {
                    cb.apply(this, [event]);
                }
            }
            on(type, callback) {
                if (Array.isArray(type)) {
                    for (const e of type) {
                        this.addEvent(e, callback);
                    }
                }
                else {
                    this.addEvent(type, callback);
                }
            }
            addEvent(type, callback) {
                if (this.events[type].indexOf(callback) === -1) {
                    this.events[type].push(callback);
                }
            }
        }
        window.localess = new Sync();
    }
})();
