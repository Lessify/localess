# @localess/visual-editor-sync

`sync-v1.js`: the script customer sites load inside the Visual Editor iframe. It reports the rendered blocks to the
editor, highlights the selected one and relays live edits back to the page over `postMessage`.

```bash
pnpm --filter @localess/visual-editor-sync build   # tsup → dist/sync-v1.js
pnpm --filter @localess/visual-editor-sync test    # build + node:test (also part of pnpm test:scripts)
```

The web app copies `dist/sync-v1.js` into its build as `/scripts/sync-v1.js` (`apps/web/angular.json` assets), so
the root `start`, `build` and `test` scripts build this package first. Change the message contract only together
with the editor in `apps/web/src/app/features/spaces/contents/`, and bump `protocol` in the `ping` event.
More: [docs/features/spaces/contents.md](../../docs/features/spaces/contents.md).
