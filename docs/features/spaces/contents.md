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
  content-preview/                       ← visual editor iframe + postMessage bridge (used by edit-document)
  add-document-dialog/                   ← create document (pick schema)
  add-folder-dialog/                     ← create folder
  edit-dialog/                           ← edit document/folder metadata
  edit-document-schema/                  ← schema field editor sub-component
  export-dialog/
  import-dialog/
  move-dialog/
  shared/
    document-status/                     ← published/draft/unpublished badge
    editor-toolbar/                      ← formatting toolbar shared by both editors below
    markdown-editor/                     ← MARKDOWN field editor (source + WYSIWYG modes)
    rich-text-editor/                    ← RICH_TEXT field editor (TipTap, stores JSON)
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

When the visual editor preview is enabled, `EditDocumentComponent` renders a `ContentPreviewComponent` (`content-preview/`), which owns the `<iframe>` embedding the target environment and the `postMessage` exchange with the embedded app (see `edit-document.model.ts` for `EventToEditorType`/`EventToAppType`). `EditDocumentComponent` only reacts to `ContentPreviewComponent`'s outputs (`connected`, `schemaSelect`, `schemaHover`, `schemaLeave`) via `previewComponent = viewChild(ContentPreviewComponent)` — it does not manage the iframe or the message handling itself.

**Connection lifecycle** — owned by `ContentPreviewComponent`, tracked in its `iframeStatus` (`linkedSignal<'loading' | 'loaded' | 'connected' | 'error'>`):
1. `loading` → `onIframeLoad()` sets `loaded` (only if still `loading`, so it won't downgrade `connected`/`error`)
2. The embedded app sends `{ type: 'ping' }` → `onWindowMessage()` sets `connected`, replies `{ type: 'pong' }` via `sendEvent()`, and emits the `connected` output — `EditDocumentComponent.onPreviewConnected()` then calls `sendCurrentContentToApp()` to push the full current content as a `change` event
3. `onIframeError()` sets `error` on load failure

`ContentPreviewComponent.sendEvent()` only dispatches when `iframeStatus() === 'connected'` — events sent before the handshake completes are dropped. `EditDocumentComponent` triggers it via `this.previewComponent()?.sendEvent(...)`.

**Events editor → app** (`EventToAppType`): `save`, `publish`, `unpublish`, `pong`, `input`, `change`, `enterSchema`, `hoverSchema`, `leaveSchema`

**Events app → editor** (`EventToEditorType`): `ping`, `selectSchema`, `hoverSchema`, `leaveSchema`

**Hover highlighting:** hovering a schema field in `EditDocumentSchemaComponent` fires `(schemaHover)`/`(schemaLeave)` → `EditDocumentComponent.onFormSchemaHover()`/`onFormSchemaLeave()` → forwarded to the app via `previewComponent()?.sendEvent({ type: 'hoverSchema' | 'leaveSchema', ... })`. Conversely, a `hoverSchema`/`leaveSchema` event *from* the app is emitted by `ContentPreviewComponent` and handled in `EditDocumentComponent`, which sets `hoverSchemaPath`/`hoverSchemaField` signals passed into `EditDocumentSchemaComponent` to highlight the corresponding field in the form.

## Field Editors: MARKDOWN vs RICH_TEXT

Both are TipTap-based, but they store different things, and that difference is the whole reason there are two components:

| | `RichTextEditorComponent` | `MarkdownEditorComponent` |
|---|---|---|
| Field kind | `RICH_TEXT` | `MARKDOWN` |
| Form control value | TipTap JSON doc (`outputFormat="json"` via ngx-tiptap's value accessor) | **markdown string, in both modes** |
| API payload | `ContentRichText` node tree | `type: string` |
| AI translate | not offered (`translate.utils.ts` — nested JSON unsupported) | supported |

Both use the same `EditorToolbarComponent`, so they offer identical formatting tools. The remaining UI differences are structural, not stylistic: the markdown editor adds a source/WYSIWYG mode toggle (rich text has no text form to switch to) and an AI translate button (rich text is not AI-translatable).

### The shared toolbar

`editor-toolbar/` holds the one copy of the formatting buttons: paragraph, H1–H6, bold, italic, strike, underline, inline code, link, ordered/bullet list, blockquote, code block, horizontal rule. There is deliberately no "which buttons" config, because both field kinds can represent all of them — only `editor` and `disabled` inputs.

**It is always rendered, including in markdown source mode, and disabled instead of hidden.** Conditionally rendering 18 wrapping buttons changed the addon row's height on every mode switch, making the surrounding controls jump. Two consequences:

- `editor` is `Editor | null`, because in source mode no TipTap instance has been built yet. `inert()` is `disabled() || editor() === null`, bound to every button's `[disabled]`, and the command handlers use `editor?.chain()` so a click can never reach a missing editor.
- Hosts pass `disabled`: the markdown editor uses `mode() === 'source' || form().disabled`, rich text uses `form().disabled` — so a read-only field (non-translatable, non-default locale) shows greyed-out buttons rather than live ones.

It exists because the two editors previously held separate copies of the same ~160 lines of button markup, which is exactly how they drifted: rich text had underline, markdown had blockquote and horizontal rule. `TOOLBAR_REQUIRED_MARKS`/`TOOLBAR_REQUIRED_NODES` are exported from the component and asserted against *both* editors' schemas in their specs, so a button can never ship without the mark or node behind it.

Two implementation notes:

- **Active states are a signal**, refreshed on the editor's `transaction` event, not `editor.isActive(...)` calls in the template. ngx-tiptap marks its own *host* view for check on each transaction; that never reaches this child component, and its `editor` input keeps the same reference, so under OnPush the buttons would freeze on first render.
- **`display: contents` on the host** keeps the buttons in the flex flow of the input group's addon row.

### Styling

`src/styles/_content-editor.scss` is scoped to **both** hosts (`ll-rich-text-editor, ll-markdown-editor`), because the markdown editor's WYSIWYG mode renders the same ProseMirror tree. Tailwind's preflight strips browser defaults from headings, blockquotes and lists, so **every block node needs an explicit rule** — an unstyled node renders as plain body text, which is not obviously a CSS bug when you hit it.

That means a node added to `markdown-extensions.ts` needs a rule here too. Currently covered: headings, code/code block, links, blockquote, `hr`, ordered/bullet lists, task lists (`ul[data-type='taskList']`), tables (TipTap wraps each in `.tableWrapper`), and images.

### Markdown editor modes

`MarkdownEditorComponent` has two modes, toggled from the toolbar, and the form control holds markdown either way:

- **`source`** — a plain `<textarea>` bound with `[formControl]`. Preserves the raw markdown byte-for-byte.
- **`wysiwyg`** — TipTap with the shared formatting toolbar, for authors who would rather not write markdown by hand. ngx-tiptap's own value accessor only emits `json`/`html`, so the control is bound by hand: `setContent(value, { contentType: 'markdown', emitUpdate: false })` on entry, and `form.setValue(editor.getMarkdown())` from the `update` handler. `emitUpdate: false` is load-bearing — merely *viewing* a document must not rewrite the stored markdown.

### The mode is a remembered user preference

Authors settle into one way of working — experienced ones hand-write markdown, others want the visual editor — so the mode is **not** per-field state. It lives in `LocalSettingsStore.markdownMode` (`'source' | 'wysiwyg'`, localStorage-backed, default `'source'`), which means it survives a reload and applies to every markdown field at once. Toggling the button *is* changing that preference.

The component derives the effective mode rather than storing one:

```ts
mode = computed<MarkdownMode>(() => (this.lossy() ? 'source' : this.settingsStore.markdownMode()));
```

Deriving it makes two properties structural instead of things to remember at each call site:

1. A field whose content WYSIWYG mode cannot represent shows as source **regardless of the preference**, and without overwriting it — so an author who works in the visual editor still sees raw markdown on that one field, and every other field stays visual. It flips back automatically once the content is no longer lossy.
2. An AI translation that returns HTML drops the field to source on its own: `setValue` fires `valueChanges` synchronously, which updates `lossy`, which updates `mode`.

Because the mode can therefore be `wysiwyg` on **init** with no toggle click, the editor is loaded by an `effect` watching `mode()`, not from the toggle handler. It is still built lazily — a source-preferring author never constructs a TipTap instance. Note for tests: the editor only exists after effects flush, so a `toggleMode()` needs a `detectChanges()` before `editor()` is readable.

### Why the extension set is wider than the toolbar

See `markdown-editor/markdown-extensions.ts`. WYSIWYG mode rewrites the entire document through `getMarkdown()` on every edit, and TipTap can only represent constructs it has an extension registered for — so anything unregistered is **destroyed, not merely unstyled** (a table becomes an empty string, an image collapses to its alt text). Hence *register wide, expose narrow*: `Image` and the table nodes are registered with no toolbar button, purely so existing content survives editing. `markdown-extensions.spec.ts` asserts the round trip for every supported construct and fails if an extension is dropped.

**Underline** is the one mark that needed special handling to make a shared toolbar possible. TipTap serializes it as `++text++`, a Pandoc-style extension that CommonMark and GFM renderers print literally — a consumer would see the plus signs. `HtmlUnderline` overrides `renderMarkdown` to emit `<u>text</u>` instead: inline HTML *is* part of CommonMark, renders as an underline everywhere, and parses straight back into the mark (TipTap resolves HTML tags against the registered schema), so the round trip is stable. The inherited `++` tokenizer is kept, so any field written before this change still loads and is upgraded on save.

### The lossiness guard

Raw HTML and GFM footnotes cannot survive the round trip (HTML tags are stripped in the browser, escaped in a DOM-less environment). `hasUnsupportedMarkdown()` scans for them — after stripping code spans, where HTML is content rather than markup, and `<u>` tags, which the editor writes itself — and the editor **disables the WYSIWYG toggle** for such fields rather than silently corrupting them. `toggleMode()` re-checks at click time, since that is the moment content would be lost. A translation result carrying HTML also drops the editor back to `source`.

One accepted normalization: GFM tokenizes bare URLs as links, so `https://x.com` is written back as `[https://x.com](https://x.com)`. It renders identically, and flagging it would disable WYSIWYG for most documents.

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
