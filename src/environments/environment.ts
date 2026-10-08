// Build-time settings only. Runtime settings (login providers, login message, plugins) come from
// the server: `GET /api/config` (see core/api/app-config.service.ts).
export const environment = {
  appName: 'Localess [Dev]',
  production: false,
  debug: true,
  version: '4.1.0',
};
