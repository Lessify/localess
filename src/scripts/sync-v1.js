"use strict";
(function () {
    function isInIframe() {
        return window.top !== window.self;
    }
    function sendEditorData(data) {
        window.parent.postMessage(data, '*');
    }
    if (isInIframe()) {
        document.querySelectorAll('[data-ll-id]').forEach(element => {
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
