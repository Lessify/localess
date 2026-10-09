# @localess/shared

The domain contract shared by [`apps/server`](../../apps/server/README.md) and [`apps/web`](../../apps/web/README.md).
Each model is defined once here; neither app redeclares it.

| Entry point | Contents |
|---|---|
| `@localess/shared` | Models and enums (`src/models/*.model.ts`, the JSON wire format), permissions (`canPerform`, `canGrant`, `canManageUser`), locales, `extractContent` |
| `@localess/shared/zod` | Zod validators for request bodies and imports (`src/models/*.zod.ts`) |

The web app imports only the first entry point, so zod stays out of the browser bundle.

## Build and test

```bash
pnpm shared:build   # tsc -b → dist/ (the server build runs it first through project references)
pnpm shared:test    # type-check + vitest
```

The server compiles against `dist/`; the web app and the server tests resolve the source directly (tsconfig
`paths` and a vitest alias), so changes there need no rebuild.
