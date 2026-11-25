// Applies the dark theme before first paint: saved as 'dark', or 'auto' (the default, also with nothing saved) on a
// system in dark mode, as LocalSettingsStore.load() does later. An external file rather than an inline <script> so the
// Content-Security-Policy (apps/server/src/infra/static/static-site.ts) does not need 'unsafe-inline'.
(function () {
  try {
    var state = JSON.parse(localStorage.getItem('LL-SETTINGS-STATE') || '{}') || {};
    var theme = state.theme || 'auto';
    var dark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (e) {
    // Unreadable settings: keep the light default.
  }
})();
