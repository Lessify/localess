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
  }
})();
