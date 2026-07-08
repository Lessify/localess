# Spaces — Contents Module

> Parent: [Spaces Overview](overview.md) · Related: [Schemas](schemas.md) · [Publish Flow](../../publish-flow.md) · [Tasks](tasks.md) · [Concepts — Content](../../concepts.md)

## Purpose

Manage structured content documents organised in a folder/document hierarchy. Supports creating, editing (via schema-driven editor), publishing, unpublishing, moving, cloning, and importing/exporting content documents.

## Routes

```
/features/spaces/:spaceId/contents           [CONTENT_READ] → ContentsComponent
/features/spaces/:spaceId/contents/:contentId              → EditDocumentComponent
  (canDeactivate: isFormDirtyGuard, resolver: documentResolver)
```

## Key Files

```
src/app/features/spaces/contents/
  contents.component.ts/html/scss        ← folder/document browser
  edit-document/                         ← full document editor (routed)
  add-document-dialog/                   ← create document (pick schema)
  add-folder-dialog/                     ← create folder
  edit-dialog/                           ← edit document/folder metadata
  edit-document-schema/                  ← schema field editor sub-component
  export-dialog/
  import-dialog/
  move-dialog/
  shared/
    document-status/                     ← published/draft/unpublished badge
```

## ContentsComponent

File-system-like browser that shows a breadcrumb path and lists folders/documents at the current path level. Driven by `SpaceStore.contentPath`.

**Injected services:** `ContentService`, `SchemaService`, `TokenService`, `TaskService`, `MatDialog`, `SpaceStore`, `NotificationService`

**Key behaviour:**
- Loads schemas from `SchemaService` (needed for the Add Document dialog's schema picker)
- Loads content at the current `contentPath` level from Firestore
- `onRowSelect(item)` — opens folder (updates `SpaceStore.contentPath`) or navigates to the document editor
- `navigateToSlug(slug)` — path breadcrumb navigation
- `openAddDocumentDialog()` — pick schema → creates `ContentDocument` with `kind: DOCUMENT`
- `openAddFolderDialog()` — creates `ContentFolder` with `kind: FOLDER`
- `openPublishDialog()` — publishes selected document to Storage (see [Publish Flow](../../publish-flow.md))
- `openUnpublishDialog()` — removes published JSON from Storage
- `openMoveDialog()` — moves document/folder to a new parent slug
- `openCloneDialog()` — deep clones a document
- `openLinksV1InNewTab()` — opens the CDN API URL for the document in a browser tab
- `openImportDialog()` / `openExportDialog()` — create Tasks for background import/export

## EditDocumentComponent (routed)

Full schema-driven editor for a single `ContentDocument`. Loaded via `documentResolver` that pre-fetches the document before navigation.

- Protected by `isFormDirtyGuard` — warns user if they navigate away with unsaved changes
- Uses `EditDocumentSchemaComponent` for rendering schema fields
- Supports locale switching to edit per-locale field values

### Visual Editor Bridge

When the visual editor preview is enabled, `EditDocumentComponent` embeds the target environment in an `<iframe>` and exchanges `postMessage` events with the embedded app (see `edit-document.model.ts` for `EventToEditorType`/`EventToAppType`).

**Connection lifecycle** — tracked in `iframeStatus` (`linkedSignal<'loading' | 'loaded' | 'connected' | 'error'>`):
1. `loading` → `onIframeLoad()` sets `loaded` (only if still `loading`, so it won't downgrade `connected`/`error`)
2. The embedded app sends `{ type: 'ping' }` → the editor sets `connected`, replies `{ type: 'pong' }`, then calls `sendCurrentContentToApp()` to push the full current content as a `change` event
3. `onIframeError()` sets `error` on load failure

`sendEventToApp()` only dispatches when `iframeStatus() === 'connected'` — events sent before the handshake completes are dropped.

**Events editor → app** (`EventToAppType`): `save`, `publish`, `unpublish`, `pong`, `input`, `change`, `enterSchema`, `hoverSchema`, `leaveSchema`

**Events app → editor** (`EventToEditorType`): `ping`, `selectSchema`, `hoverSchema`, `leaveSchema`

**Hover highlighting:** hovering a schema field in `EditDocumentSchemaComponent` fires `(schemaHover)`/`(schemaLeave)` → `onFormSchemaHover()`/`onFormSchemaLeave()` → forwarded to the app as `hoverSchema`/`leaveSchema`. Conversely, a `hoverSchema`/`leaveSchema` event *from* the app sets `hoverSchemaPath`/`hoverSchemaField` signals, which are passed into `EditDocumentSchemaComponent` to highlight the corresponding field in the form.

## Dialogs

| Dialog | Purpose |
|--------|---------|
| `AddDocumentDialogComponent` | Pick a Schema type, enter slug and name |
| `AddFolderDialogComponent` | Enter folder name and slug |
| `EditDialogComponent` | Edit document/folder name and slug |
| `ExportDialogComponent` | Choose documents/folders to export |
| `ImportDialogComponent` | Upload content file → creates a Task |
| `MoveDialogComponent` | Pick destination folder |
| `ConfirmationDialogComponent` | Delete / unpublish confirmation |

## Services Used

| Service | Purpose |
|---------|---------|
| `ContentService` | CRUD, publish, unpublish, move, clone |
| `SchemaService` | Load schemas for picker + editor field rendering |
| `TokenService` | API token for CDN preview links |
| `TaskService` | Create import/export tasks |
| `NotificationService` | Snackbar feedback |
| `SpaceStore` | Current space, `contentPath` for breadcrumb navigation |
