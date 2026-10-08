// `npm start` (ng serve on :4200) forwards the API to the NestJS server (`npm run server:dev`, :3000),
// so the session cookie stays same-origin. SSE (`/api/app/events`) streams through unchanged.
const PROXY_CONFIG = [
  {
    context: ['/api'],
    target: `http://127.0.0.1:${process.env.LOCALESS_SERVER_PORT || 3000}`,
    secure: false,
    logLevel: 'warn',
    changeOrigin: true,
  },
];
module.exports = PROXY_CONFIG;
