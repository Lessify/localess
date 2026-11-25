# `ll-upload-queue` — uploads in the action bar

> Related: [Components index](README.md) · [Assets](../features/spaces/assets.md)

## Overview

`apps/web/src/app/shared/components/upload-queue/` shows the files a screen uploads, and
`apps/web/src/app/core/utils/upload-queue.ts` (`UploadQueue`) uploads them. The component only shows; the queue
does the work, so a screen can test its uploads without rendering anything.

It is a pill in the action bar, built like `ll-active-tasks`: "Uploading n of m" with the bytes sent of the batch on
its bottom edge, a "n failed" badge, and a popover listing each file (waiting, its progress, done, or why it failed,
with Retry and Dismiss). It is project-owned and composed from Spartan Helm primitives (`HlmPopover`, `HlmProgress`,
`HlmBadge`, `HlmButton`, `HlmSpinner`), so it lives here rather than in `packages/ui`.

## Usage

```typescript
imports: [UploadQueueComponent],
```

```typescript
/** A field: the queue needs an injection context. */
readonly uploads = new UploadQueue(message => this.notificationService.error(message));

private enqueue(file: File): void {
  // Read the target now: the file may start after the user has opened another folder.
  const spaceId = this.spaceId();
  const folderId = this.folderId;
  this.uploads.add(file.name, file.size, progress => this.assetService.createFile(spaceId, folderId, file, progress));
}
```

```html
<ll-upload-queue [queue]="uploads" />
```

## API

### `UploadQueue`

| Member | Type | Notes |
|---|---|---|
| `constructor(onError?, concurrency?)` | `(message: string) => void`, `number` | `onError` gets `uploadErrorMessage(name, error)` for each failed file. `concurrency` defaults to `UPLOAD_CONCURRENCY` (3). |
| `add(name, size, start)` | `string`, `number`, `UploadStart` | `size`: 0 when unknown (a URL not downloaded yet). `start(progress)` returns the request; it completes when the file is stored. |
| `retry(id)` / `dismiss(id)` | `number` | A failed file only; ignored otherwise. |
| `items` | `Signal<readonly UploadItem[]>` | `{ id, name, status: 'waiting' \| 'uploading' \| 'done' \| 'error', loaded, total, error? }`, in the order added. |
| `pending` / `done` / `failed` | `Signal<number>` | Waiting or uploading; done; failed. |
| `percent` | `Signal<number \| undefined>` | Of the bytes of the batch, failed files left out; `undefined` while no size is known. |

### `UploadQueueComponent` — `<ll-upload-queue>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `queue` | `UploadQueue` | required | Shown only while it has a file. |

## Behaviour

- Up to three files upload at once, each its own request; the next starts when one ends, done or failed.
- A failed file is told once (`onError`, a toast on the Assets page) and stays listed with its reason until it is
  retried or dismissed; the others go on.
- Done files stay listed (with a check) until nothing waits or uploads, then they go: the list keeps only what
  needs the user. With no failures the pill disappears when the batch ends.
- `AssetService.upload()` reports the request's upload events: `total` is the request's size, a little over the
  file's, so a row's total changes slightly once its first event comes.
- A URL import (`AssetService.importFile`) downloads first: its row says "Downloading" until the upload's first event.

## Working on this component

### Read the target folder in `enqueue`, never in `start`

`start` runs when a slot frees up, which may be minutes later. A `start` that reads the folder shown (`this.folderId`)
sends every file still waiting into whatever folder the user has opened meanwhile. This was a real bug of the
one-at-a-time queue this replaced; the spec "uploads into the folder shown when the file was picked" guards it.

### Every failure ends inside `run`

`run` catches each upload's error (and `defer` turns a `start` that throws into one). An error reaching the
`mergeMap` stream would end it, and every later upload on the screen with it, silently.

### Create the queue in an injection context

It subscribes with `takeUntilDestroyed()`: as a component field it stops with the component. Created elsewhere it
throws (`NG0203`); in a test use `TestBed.runInInjectionContext`.

## Reference consumer

`apps/web/src/app/features/spaces/assets/assets.component.ts` (files, URL and Unsplash imports);
`apps/web/src/app/features/spaces/contents/shared/assets-select-dialog/assets-select-dialog.component.ts`.
