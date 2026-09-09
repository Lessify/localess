/**
 * Build-time constants inlined by esbuild through the `define` builder option.
 *
 * Defaults live in angular.json's production configuration; `npm run deploy` overrides them
 * per project with `--define`. Only environment.prod.ts reads them, and `fileReplacements`
 * compiles that file exclusively in the production configuration, so a development or
 * docker build can never reach an undefined identifier.
 */
declare const LOCALESS_REGION: string;
declare const LOCALESS_AUTH_CUSTOM_DOMAIN: string;
declare const LOCALESS_AUTH_PROVIDERS: string;
declare const LOCALESS_LOGIN_MESSAGE: string;
declare const LOCALESS_UNSPLASH_ENABLE: string;
