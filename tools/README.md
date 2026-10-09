# tools

Repository tooling, not part of any workspace package.

| Path | Purpose | Run |
|---|---|---|
| `scripts/bump-version.mjs` | Bumps the version in every `package.json`, the web environments and the server OpenAPI spec | `pnpm version:patch` (or `:minor`, `:major`) |
| `scripts/generate-version.js` | Writes `version.json` (version + `GITHUB_SHA`) into the web build | `pnpm version:generate` (CI) |
| `scripts/generate-locale-flags.mjs` | Regenerates `apps/web/src/app/shared/components/locale-icon/locale-flags.ts` from `circle-flags` | `node tools/scripts/generate-locale-flags.mjs` after upgrading the package |
| `openapi/` | Third-party OpenAPI specs for client generation | `pnpm generate:github` |

`pnpm test:scripts` runs the `*.test.mjs` suites here.
