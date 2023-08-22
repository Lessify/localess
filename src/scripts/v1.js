(function () {
  function isInIframe() {
    return true; //window.top !== window.self
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
          // console.log(element)
          // console.log(event.srcElement)


          const id = element.getAttribute('data-ll-id')
          if (id) {
            const path = [id]
            let selectedElement = element
            while (selectedElement) {
              selectedElement = selectedElement.parentElement.closest(`[data-ll-id]`);
              if (selectedElement) {
                path.unshift(selectedElement.getAttribute('data-ll-id'))
              }
            }
            console.log(path)

            sendEditorData({
              owner: 'LOCALESS',
              id: id,
              path: path
            })
          }
        })
      });
  }
})();
