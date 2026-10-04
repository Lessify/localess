# F28 — Live edits carry resolved links, references and assets

**Status:** Backlog (not started) · **Spans:** platform (this repo) + SDK (`localess-js`, same F-number —
its file holds the SDK-side detail)
**Recorded:** 2026-10-04, from the platform ↔ SDK sync audit.

## Problem

Visual Editor live edits send only the document's field data: `input` / `change` are
`{ type, documentId, data }` (`edit-document.component.ts:639, 645, 658`; type in
`edit-document.model.ts:36`), built by `extractContent()`. The `links`, `references` and `assets` maps
the app fetched at page load never change during editing, so a link, reference or image picked in the
editor doesn't resolve in the preview: links go to `/not-found`, references render empty, images lose
`alt` and dimensions. Most SDKs don't refetch on `save` either, so it stays wrong until the preview is
reloaded by hand.

The app usually can't resolve the new ids itself in the browser (secret-token client, server-side
only). The editor is the only place that knows, at edit time, what was just picked.

## Proposal (platform side)

Extend the `input` / `change` events with optional maps, in the API's shapes, scoped to the ids that
appear in `data`:

```ts
{ type: 'input' | 'change'; documentId: string; data: any; links?: Links; references?: References; assets?: Assets }
```

1. **`links` and `assets` first.**
   - `links`: `ContentMetadata` for every document id a LINK in `data` points to, from the documents
     list the editor already holds (`documents()` in `edit-document-schema.component.ts:142`).
   - `assets`: `AssetMetadata` (as served by the API — `content.service.ts:332-390`) for every asset id
     in `data`, from a per-document cache filled by the asset pickers, which already load each asset.
2. **`references` next.** For every referenced document id in `data`: the document the reference
   pickers already load, with `extractContent` applied for the selected locale (client-side,
   `shared/utils/content.ts`), shaped like the API's resolved reference (`stripStorageIds`). One level
   deep, as the API does.

Keep payloads bounded: only ids present in the current `data`, recomputed per event, with the caches
living for the editor session.

## Out of scope

- No new endpoint; no change to the delivery API.
- References inside references.
- The SDK side (event type, merging in each framework's `LocalessDocument`, Astro middleware) — see
  `localess-js/docs/roadmap/F28-live-edit-resolved-maps.md`.
