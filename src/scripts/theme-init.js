// Applies the saved dark theme before first paint. An external file rather than an inline
// <script> so the Content-Security-Policy (server/src/static/static-site.ts) does not need 'unsafe-inline'.
(function () {
  try {
    var state = JSON.parse(localStorage.getItem('LL-SETTINGS-STATE') || '{}');
    if (state && state.theme === 'dark') {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (e) {
    // Unreadable settings: keep the light default.
  }
})();
