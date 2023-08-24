(function () {
  function isInIframe() {
    return window.top !== window.self
  }

  function sendEditorData(data) {
    window.parent.postMessage(data, '*')
  }

  if (isInIframe()) {
    document.querySelectorAll('[data-ll-id]')
      .forEach((element) => {
        element.style.outline = '#003DFF dashed';
        element.addEventListener('click', (event) => {
          event.stopPropagation()
          const id = element.getAttribute('data-ll-id')
          if (id) {
            sendEditorData({
              owner: 'LOCALESS',
              id: id
            })
          }
        })
      });
  }
})();
