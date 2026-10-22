# Contents in `SpaceStore`: patch from change events (TODO)

> Status: TODO, for when spaces grow past a few thousand contents. Related: [Contents](../features/spaces/contents.md) ·
> [Frontend state](../frontend-state.md) · [Pagination](../server/pagination.md) ·
> [Contents (large) template](contents-large-template.md)

## Today

`SpaceStore` holds a light list of every folder and document of the selected space (`GET …/contents/names`,
`ContentSummary`: `id`, `kind`, `parentId`, `name`, `slug`, `publishedAt`, `updatedAt`; paths worked out from the folder
chain, `core/utils/content-summaries.ts`). It feeds the breadcrumbs, the Move
dialog's folder tree, the Link field picker and the References / Reference fields. It is a live query: every
`contents` change event (a save, publish, move or delete, by anyone) fetches the whole list again.

At the sizes we target that is cheap: about 150 bytes an item, about 300 KB (about 50 KB gzipped) for the 2,000
documents and 67 folders of the "Contents (large)" template.

## The problem at scale

The cost grows with the space and with how often anyone writes: with tens of thousands of contents and several editors
saving, every open tab downloads megabytes per save.

## The change to make then

Patch the list from the change event instead of reading it all again:

- The `contents` change event already carries the row's `id` and `op` (`created`, `updated`, `deleted`).
- `created` / `updated`: read that one item (a summary by id) and replace or insert it in the store's list.
- `deleted`: remove it, and for a folder everything under it (the event is sent per deleted row, so each one arrives).
- A move of a folder sends an event for every row under it; the paths are worked out from the folder chain, so only the
  moved folder's `parentId` must change for every path below it to follow.
- Read the whole list again when the event stream reconnects (events may have been missed), and as today on a space
  change.

## To decide then

- A batch read of the summaries by ids (`?ids=`), or one per event, debounced.
- Whether the event should carry the summary itself (no read at all), and what that means for its size and for roles
  that may not read contents.
