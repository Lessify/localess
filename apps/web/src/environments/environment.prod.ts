// Build-time settings only. Runtime settings (login providers, login message, plugins) come from
// the server: `GET /api/config` (see core/api/app-config.service.ts).
export const environment = {
  appName: 'Localess',
  production: true,
  debug: false,
  version: '4.1.0',
};
