# Spartan UI Migration Guide

> Related: [`MatTable` → `ll-table` Migration Guide](table-migration.md)

> This document captures hard-won knowledge from migrating Angular Material components to the Spartan/Helm UI library (`libs/ui/`). Read this before touching any dialog, form, or notification code.

---

## Migration Philosophy

- **Dialog frame stays Material** — `MatDialogModule` (`mat-dialog-title`, `mat-dialog-content`, `mat-dialog-actions`, `[mat-dialog-close]`) is kept for the dialog container. Only form and interactive elements inside are replaced with Spartan.
- **Spartan components are headless primitives** — they render with `display: contents` or inject host classes. Layout is your responsibility.
- **All components are standalone** — import via `*Imports` barrel constants (e.g. `HlmButtonImports`, `HlmCheckboxImports`).

---

## Component Replacement Table

| Angular Material | Spartan Equivalent | Import |
|---|---|---|
| `MatButtonModule` | `hlmBtn` directive | `HlmButtonImports` |
| `MatFormFieldModule` | `hlmField` + `hlmFieldLabel` | `HlmFieldImports` |
| `MatInputModule` | `hlmInput` directive | `HlmInputImports` |
| `MatInputModule` (textarea) | `hlmTextarea` directive | `HlmTextareaImports` |
| `MatSelectModule` | `hlm-select` + related | `HlmSelectImports` |
| `MatAutocompleteModule` | `hlm-combobox` + related | `HlmComboboxImports` (see Combobox section) |
| `MatSlideToggleModule` | `hlm-switch` | `HlmSwitchImports` |
| `MatCheckboxModule` (boolean toggle) | `hlm-switch` with `formControlName` | `HlmSwitchImports` |
| `MatCheckboxModule` / `mat-selection-list` | `hlm-checkbox` | `HlmCheckboxImports` |
| `MatButtonToggleModule` | `hlm-toggle-group` + `hlmToggleGroupItem` | `HlmToggleGroupImports` |
| `MatChipsModule` (`mat-chip-grid`) | `hlmInput` + `hlmBtn` badges | see Chips section |
| `MatDividerModule` | `hlm-separator` | `HlmSeparatorImports` |
| `MatTooltipModule` | `hlmTooltip` directive | `HlmTooltipImports` |
| `MatExpansionModule` | `hlm-accordion` + related | `HlmAccordionImports` |
| `MatCardModule` | `hlm-card` + related | `HlmCardImports` |
| `MatSnackBar` | `toast` from `ngx-sonner` | see Notifications section |

---

## `mat-form-field` → `hlmField` — Standard Field Pattern

Every `<mat-form-field>` maps to a `<div hlmField>` wrapper. The full anatomy:

```html
<div hlmField>
  <label hlmFieldLabel for="name">Name</label>
  <div hlmInputGroup>
    <input hlmInputGroupInput id="name" type="text" formControlName="name" />
    <hlm-input-group-addon align="inline-end" class="text-muted-foreground text-xs">{{ form.controls['name'].value?.length || 0 }}/30</hlm-input-group-addon>
  </div>
  <hlm-field-description>Helper text here.</hlm-field-description>
  @if (form.controls['name'].errors; as errors) {
    <hlm-field-error>{{ fe.errors(errors) }}</hlm-field-error>
  }
</div>
```

Key rules:
- Always add `id` to the input and matching `for` on the label (ESLint requires it)
- **Character counter on a text input** → always use `hlmInputGroup` + `hlm-input-group-addon align="inline-end"` (places the counter inside the input at the trailing edge). Never use `<hlm-field-description class="text-right">` for counters on text inputs.
- **Character counter on a textarea** → use `hlmInputGroup` + `hlmInputGroupTextarea` + `hlm-input-group-addon align="block-end"` wrapping a `hlm-input-group-text`. This is the same group pattern as for text inputs, but with `align="block-end"` (below) instead of `align="inline-end"` (inside trailing edge). Do **not** use `hlmTextarea` + `hlm-field-description class="text-right"` for counters on textareas.
- When there is no counter, a plain `<input hlmInput class="w-full" />` (no group wrapper) is fine
- `mat-hint` (descriptive) → `<hlm-field-description>`
- Multiple `hlm-field-description` elements are allowed in the same field
- `mat-error` → `<hlm-field-error>` (component, not directive — see field error section)

### Textarea

Replace `<textarea matInput cdkTextareaAutosize>` with `<textarea hlmInputGroupTextarea>` inside `<hlm-input-group>`. This automatically applies textarea styling. When a character counter is needed, add `<hlm-input-group-addon align="block-end">`:

```html
<!-- ❌ Before -->
<textarea matInput formControlName="description" cdkTextareaAutosize cdkAutosizeMinRows="2" cdkAutosizeMaxRows="6"></textarea>
<mat-hint align="end">{{ form.controls['description'].value?.length || 0 }}/250</mat-hint>

<!-- ✅ After — with counter -->
<hlm-input-group>
  <textarea hlmInputGroupTextarea id="description" formControlName="description"></textarea>
  <hlm-input-group-addon align="block-end">
    <span hlmInputGroupText class="text-muted-foreground text-xs">{{ form.controls['description'].value?.length || 0 }}/250</span>
  </hlm-input-group-addon>
</hlm-input-group>

<!-- ✅ After — without counter (no group needed) -->
<textarea hlmTextarea id="description" formControlName="description" class="resize-none"></textarea>
```

Remove `TextFieldModule` and `HlmTextareaImports` from imports when all textareas in the component use `hlmInputGroupTextarea` — it is already included in `HlmInputGroupImports`.

---

## `mat-chip-grid` → Spartan Tags Pattern

There is no Spartan chip component. Replace `mat-chip-grid` / `mat-chip-row` with a plain `hlmInput` (for adding) and `hlmBtn` outline buttons (for display + removal):

**Template:**
```html
<div hlmField>
  <label hlmFieldLabel for="labels">Labels</label>
  <input
    #labelInput
    hlmInput
    id="labels"
    type="text"
    autocomplete="off"
    placeholder="Add label..."
    class="w-full"
    (keydown.enter)="$event.preventDefault(); addLabel(labelInput.value); labelInput.value = ''" />
  <div class="flex flex-wrap gap-2">
    @for (label of form.controls['labels'].value; track label) {
      <button hlmBtn variant="outline" size="xs" (click)="removeLabel(label)">
        <ng-icon hlm size="xs" name="lucideCircleX" />
        {{ label }}
      </button>
    }
  </div>
</div>
```

**Component class:**
```typescript
addLabel(value: string): void {
  if (value.trim()) {
    const labels: string[] = this.form.controls['labels'].value ?? [];
    this.form.controls['labels'].setValue([...labels, value.trim()]);
  }
}

removeLabel(label: string): void {
  const labels: string[] = this.form.controls['labels'].value;
  this.form.controls['labels'].setValue(labels.filter(l => l !== label));
}
```

**Imports / providers required:**
```typescript
imports: [..., HlmInputImports, HlmButtonImports, HlmIconImports],
providers: [provideIcons({ lucideCircleX })],
```

> **Always use immutable updates** — call `setValue([...spread])` instead of mutating the array with `push` or `splice`. Mutating the array directly does not trigger Angular's change detection.

---

## `mat-checkbox` (boolean toggle) → `hlm-switch`

For a simple boolean form control (e.g. `autoTranslate`, `lock`), use `hlm-switch` with `formControlName` directly. Reserve `hlm-checkbox` for multi-select lists managed manually via `[checked]` + `(checkedChange)`.

```html
<!-- ❌ Before -->
<mat-checkbox formControlName="autoTranslate">Translate other locales?</mat-checkbox>

<!-- ✅ After -->
<div class="flex items-center gap-3">
  <hlm-switch formControlName="autoTranslate" id="autoTranslate" />
  <label hlmLabel for="autoTranslate">Translate other locales?</label>
</div>
```

Import: `HlmSwitchImports`, `HlmLabelImports`.

---

## Dialog Actions Layout

Always add `class="flex gap-2"` to `<mat-dialog-actions>` and wrap the form in `class="flex flex-col gap-4 py-2"`:

```html
<!-- Form -->
<mat-dialog-content>
  <form [formGroup]="form" class="flex flex-col gap-4 py-2">
    ...
  </form>
</mat-dialog-content>

<!-- Actions -->
<mat-dialog-actions align="end" class="flex gap-2">
  <button hlmBtn variant="outline" [mat-dialog-close]="undefined">Cancel</button>
  <button hlmBtn [mat-dialog-close]="form.value" [disabled]="!form.valid">Save</button>
</mat-dialog-actions>
```

For **confirmation dialogs** (destructive actions), use `variant="destructive"` on the confirm button:

```html
<mat-dialog-actions align="end" class="flex gap-2">
  <button hlmBtn variant="outline" [mat-dialog-close]="false">Cancel</button>
  <button hlmBtn variant="destructive" [mat-dialog-close]="true">Delete</button>
</mat-dialog-actions>
```

Remove the `<br />` spacers that were commonly added before/after `<form>` in Material dialogs — the `py-2` on the form and `gap-4` between fields handle spacing.

---

## Table Filter Input — Spartan `hlmInputGroup` Pattern

Replace `<mat-form-field>` + `(keyup)` event-based filtering with a reactive form + `hlmInputGroup`:

**Template:**
```html
<form [formGroup]="filterForm">
  <fieldset hlmFieldSet>
    <div hlmFieldGroup class="mb-3">
      <div hlmInputGroup>
        <input hlmInputGroupInput placeholder="Search..." formControlName="search" type="search" />
        <div hlmInputGroupAddon>
          <ng-icon hlm size="sm" name="lucideSearch" />
        </div>
      </div>
    </div>
  </fieldset>
</form>
```

**Component class:**
```typescript
filterForm = this.fb.group({
  search: this.fb.control<string>('', []),
});

ngOnInit(): void {
  this.filterForm.valueChanges.pipe(debounceTime(300)).subscribe({
    next: value => {
      this.dataSource.filter = (value.search ?? '').toLowerCase();
    },
  });
}
```

**Imports required:**
```typescript
imports: [..., ReactiveFormsModule, HlmFieldImports, HlmInputGroupImports, HlmIconImports],
providers: [provideIcons({ lucideSearch })],
```

Remove `MatFormFieldModule` and `MatInputModule`. The `(keyup)` handler and `applyFilter(event: KeyboardEvent)` method are no longer needed.

---

## `hlm-select` — `itemToString` with Dynamic Data

When select items come from injected dialog data (not a static enum), build the `itemToString` function by looking up from the data array:

```typescript
// Static enum (known at compile time)
protected readonly roleItemToString = (value: string): string => {
  const labels: Record<string, string> = { custom: 'Custom', admin: 'Admin' };
  return labels[value] ?? value;
};

// Dynamic data (items from MAT_DIALOG_DATA)
protected readonly localeItemToString = (value: string): string => {
  return this.data.locales.find(l => l.id === value)?.name ?? value;
};
```

The rule is the same in both cases: **always provide `[itemToString]` when the select has a pre-selected value and uses `*hlmSelectPortal`**.

### Prefix icon in the trigger

To show an icon alongside the selected value text in the trigger, wrap both in `<span class="flex items-center gap-2">`. Without the wrapper the icon and value are block-level siblings and the icon stacks above the text.

```html
<!-- ❌ Wrong — icon stacks above the value text -->
<hlm-select-trigger class="w-full">
  <ng-icon hlm size="sm" [name]="schemaTypeDescriptions[type].icon" class="mr-2" />
  <hlm-select-value />
</hlm-select-trigger>

<!-- ✅ Correct — icon and value are inline and vertically centred -->
<hlm-select-trigger class="w-full">
  <span class="flex items-center gap-2">
    <ng-icon hlm size="sm" [name]="schemaTypeDescriptions[type].icon" />
    <hlm-select-value />
  </span>
</hlm-select-trigger>
```

The icon binding can be driven by a getter or `computed()` that reads the current form control value, making it reactive to user selection:

```typescript
// Getter reads the reactive form value
get type(): SchemaType {
  return this.form.controls['type'].value;
}
```

```html
<span class="flex items-center gap-2">
  <ng-icon hlm size="sm" [name]="schemaTypeDescriptions[type].icon" />
  <hlm-select-value />
</span>
```

---



### Host renders as `display: contents`

`HlmCheckbox` has `host: { class: 'contents peer' }`. The host element disappears from the layout tree; its inner `brn-checkbox` becomes the actual flex item. This is correct and intentional — do not add margin/padding to `hlm-checkbox` itself.

### ❌ Wrong — description nested inside `<label>`

```html
<div class="flex items-start gap-3">
  <hlm-checkbox [inputId]="id" ... />
  <label hlmLabel [for]="id" class="flex flex-col">
    <span>Label text</span>
    <span class="text-muted-foreground">Description</span>
  </label>
</div>
```

**Why it breaks:** `hlmLabel` injects `flex items-center gap-2` onto every `<label>` element via the `HlmLabel` directive constructor. Adding `flex-col` to the class attribute creates a conflict (`items-center` + `flex-col` = horizontal centering of spans), breaking alignment.

### ✅ Correct — Spartan docs pattern (description as sibling `<p>`)

```html
<div class="flex items-start gap-3">
  <hlm-checkbox [inputId]="perm.id" [checked]="..." (checkedChange)="..." />
  <div class="grid gap-1.5 leading-none">
    <label hlmLabel [for]="perm.id">Label text</label>
    <p class="text-muted-foreground text-sm font-normal">Description text</p>
  </div>
</div>
```

- `<label>` stays clean — `hlmLabel` applies its styles without conflict
- Description moves to a sibling `<p>` inside a `div.grid.gap-1.5.leading-none`

### Replacing `mat-selection-list`

There is no direct Spartan equivalent. Replace with individual `hlm-checkbox` components managed manually:

**Component class:**
```typescript
isPermissionSelected(permission: string): boolean {
  return this.form.controls['permissions'].value?.includes(permission) ?? false;
}

togglePermission(permission: string, checked: boolean): void {
  const current: string[] = this.form.controls['permissions'].value ?? [];
  const updated = checked ? [...current, permission] : current.filter(p => p !== permission);
  this.form.controls['permissions'].setValue(updated);
}
```

**Template:**
```html
<hlm-checkbox
  [inputId]="perm.id"
  [checked]="isPermissionSelected(perm.id)"
  (checkedChange)="togglePermission(perm.id, $event)" />
```

### Permissions list grouping pattern

When rendering a grouped list of checkboxes (e.g. by category), avoid flat `flex flex-col gap-1`. Wrap each section and use `@if (!last)` for separators:

```html
@for (group of permissionGroups; track group.label; let last = $last) {
  <div class="flex flex-col gap-2">
    <p class="text-muted-foreground text-xs font-medium tracking-wide uppercase">{{ group.label }}</p>
    <div class="flex flex-col gap-2">
      @for (perm of group.permissions; track perm.id) {
        <div class="flex items-start gap-3">
          <hlm-checkbox [inputId]="perm.id" ... />
          <div class="grid gap-1.5 leading-none">
            <label hlmLabel [for]="perm.id">{{ perm.label }}</label>
            <p class="text-muted-foreground text-sm font-normal">{{ perm.desc }}</p>
          </div>
        </div>
      }
    </div>
  </div>
  @if (!last) {
    <hlm-separator />
  }
}
```

Move the data into a separate shared file to avoid duplication across dialogs. See `src/app/features/admin/users/user-permissions.ts` as a reference:

```typescript
export interface UserPermission { id: string; label: string; desc: string; }
export interface UserPermissionGroup { label: string; permissions: UserPermission[]; }
export const USER_PERMISSION_GROUPS: UserPermissionGroup[] = [ ... ];
```

---

## `hlm-select` — Portal & Pre-selected Value Pitfalls

### The portal lazy-rendering problem

`*hlmSelectPortal` is powered by `BrnPopoverContent`. Items inside are **rendered lazily** — only when the dropdown is opened. This means `BrnSelectItem`s haven't registered with `BrnSelect` before the first user interaction.

**Consequence:** When a value is set programmatically (via `formControlName`, `patchValue`, or `[value]` binding), `BrnSelectValue` cannot find the matching item's label text and falls back to the raw value string — so `"custom"` is displayed instead of `"Custom"`.

**Fix: always provide `[itemToString]`** for any `hlm-select` that uses `*hlmSelectPortal`:

```typescript
// Component class
protected readonly roleItemToString = (value: string): string => {
  const labels: Record<string, string> = { custom: 'Custom', admin: 'Admin' };
  return labels[value] ?? value;
};
```

```html
<hlm-select formControlName="role" [itemToString]="roleItemToString">
  ...
</hlm-select>
```

### The `undefined` vs `null` problem for "empty" selection

**Never use `[value]="undefined"` for a "None/empty" option.** The Spartan Brain library has an internal inconsistency:

| Check | `null` | `undefined` |
|---|---|---|
| `hasValue()` uses `!== null` | `false` → no value ✓ | `true` → has value ✗ |
| `stringifyAsLabel()` uses `!= null` (loose) | skips `itemToString` | skips `itemToString` |

When `undefined` is the value:
- `hasValue()` = `true` (unexpected) → tries to display a label
- `stringifyAsLabel(undefined, fn)` skips `itemToString` → falls through to `serializeValue(undefined)` → returns `''`
- Result: element is visible but empty

**Fix: always use `[value]="null"` for the "none" item**, and set `placeholder` on `hlm-select-value`:

```html
<!-- ❌ Wrong -->
<hlm-select-item [value]="undefined">None</hlm-select-item>

<!-- ✅ Correct -->
<hlm-select-item [value]="null">None</hlm-select-item>
```

```html
<hlm-select-value placeholder="None" />
```

When `null` is selected → `hasValue()` = `false` → `_value` = `placeholder()` = `'None'`.

**Also:** when patching a form with existing data that may have `undefined` for an optional field, convert it to `null` before calling `patchValue`:

```typescript
ngOnInit(): void {
  if (this.data != null) {
    this.form.patchValue({ ...this.data, role: this.data.role ?? null });
  }
}
```

### `for` / `id` accessibility on `hlm-select`

ESLint rule `@angular-eslint/template/label-has-associated-control` requires matching `for` on the label and `id` on the control. For `hlm-select`, put the `id` on the `<hlm-select>` element itself:

```html
<label hlmFieldLabel for="role">Role</label>
<hlm-select id="role" formControlName="role" [itemToString]="roleItemToString">
  ...
</hlm-select>
```

---

## `hlm-field-error` — Use Component, Not Directive

The Spartan field error API changed. **Always use the component form** inside `hlmField`:

```html
<!-- ❌ Old directive form (removed) -->
<p hlmFieldError>{{ fe.errors(errors) }}</p>

<!-- ✅ Correct component form -->
<hlm-field-error>{{ fe.errors(errors) }}</hlm-field-error>
```

---

## Notifications — `MatSnackBar` → Spartan Sonner

### Setup

`HlmToaster` must be added once to the root shell:

```html
<!-- app.component.html -->
<hlm-toaster richColors />
```

```typescript
// app.component.ts
imports: [..., HlmToasterImports]
```

### `NotificationService` API

All toast calls go through `NotificationService` (`src/app/shared/services/notification.service.ts`). Never call `toast()` directly from feature components.

```typescript
// Public methods
notificationService.success('Saved');
notificationService.error('Failed', options?);
notificationService.info('Message', options?);
notificationService.warning('Message', options?);
notificationService.default('Message', options?);
```

### `NotificationOptions` and `ToastAction`

The second argument is `NotificationOptions` — a subset of Sonner's `ExternalToast` with the `action` field replaced by a discriminated union:

```typescript
type ToastAction =
  | { type: 'route'; label: string; link: string }   // in-app RouterLink
  | { type: 'link';  label: string; link: string }   // external URL, new tab
  | { type: 'action'; label: string; onClick: () => void }; // custom callback

type NotificationOptions = Omit<ExternalToast, 'action'> & { action?: ToastAction };
```

**Examples:**

```typescript
// In-app navigation
this.notificationService.success('Content saved', {
  action: { type: 'route', label: 'View', link: '/features/spaces/...' }
});

// External link
this.notificationService.error('Deploy failed', {
  action: { type: 'link', label: 'Logs', link: 'https://console.cloud.google.com/...' }
});

// Custom action (e.g. page reload)
this.notificationService.info('New version available', {
  position: 'bottom-left',
  description: 'Refresh to get the latest improvements.',
  duration: 300000,
  action: { type: 'action', label: 'Reload', onClick: () => window.location.reload() },
  cancel: { label: 'Skip' },
});
```

The internal `toAction()` / `toExternalToast()` conversion is private — callers never interact with Sonner's `ExternalToastAction` shape directly.

---

## `MatAutocompleteModule` → `HlmComboboxImports`

> ⚠️ **`HlmAutocompleteImports` is broken** in the current install. `HlmAutocompleteInput` references `BrnAutocompleteInputWrapper` which does not exist in the installed `@spartan-ng/brain` v0.0.1-alpha.692. **Do not use `HlmAutocompleteImports`.**

Use `HlmComboboxImports` instead. The combobox supports an inline search input (no trigger button) with server-side or client-side filtering.

### Template structure

```html
<hlm-combobox
  [(search)]="search"
  [filter]="noOpFilter"
  [value]="selectedItem()"
  (valueChange)="onValueChange($event)"
  [itemToString]="displayItem">
  <hlm-combobox-input placeholder="Search..." showClear />
  <hlm-combobox-content *hlmComboboxPortal>
    <hlm-combobox-empty>No results found.</hlm-combobox-empty>
    <div hlmComboboxList>
      @for (item of filteredItems(); track item.id) {
        <hlm-combobox-item [value]="item">{{ item.name }}</hlm-combobox-item>
      }
    </div>
  </hlm-combobox-content>
</hlm-combobox>
```

> ❌ **Wrong portal structure** — will render an empty dropdown:
> ```html
> <div *hlmComboboxPortal hlmComboboxContent>...</div>
> ```
> ✅ **Correct** — use `<hlm-combobox-content *hlmComboboxPortal>` (element with structural directive).

### Server-side search (async)

Use `[(search)]="search"` two-way binding, `toSignal` + `toObservable` + `debounceTime` + `switchMap`, and `[filter]="noOpFilter"` to disable the built-in client-side filter (results are already filtered server-side):

```typescript
search = signal('');
selectedItem = signal<MyType | null>(null);

filteredItems = toSignal(
  toObservable(this.search).pipe(
    startWith(''),
    debounceTime(500),
    switchMap(it => this.myService.findAllByName(this.spaceId, it, 5)),
  ),
  { initialValue: [] as MyType[] },
);

protected readonly displayItem = (item?: MyType): string =>
  item ? item.name : '';

// Disable built-in client-side filter — items already filtered server-side
protected readonly noOpFilter = (): boolean => true;

onValueChange(item: MyType | null): void {
  this.selectedItem.set(item);
  this.form.controls['path'].setValue(item?.id ?? undefined);
}
```

> ⚠️ **Common bug — empty dropdown on open:** Do **not** guard the `switchMap` with `it ? service.find(...) : of([])`. When the combobox opens the search string is `''` (falsy), which returns an empty array and the dropdown appears blank. Always call the service unconditionally — pass the empty string and let the service return the first N results.
>
> ```typescript
> // ❌ Wrong — dropdown is empty on open
> switchMap(it => (it ? this.myService.findAllByName(spaceId, it, 5) : of([])))
>
> // ✅ Correct — service always called, returns first 5 items on open
> switchMap(it => this.myService.findAllByName(spaceId, it, 5))
> ```

### Icons inside combobox items

Use `<ng-icon hlm size="sm" [name]="..." />` inside `<hlm-combobox-item>` to show a leading icon. Bind the icon name dynamically using the item's `kind` discriminant:

```html
<hlm-combobox-item [value]="item">
  <ng-icon hlm size="sm" [name]="item.kind === 'FOLDER' ? 'lucideFolder' : 'lucideFileText'" />
  {{ item.name }}
</hlm-combobox-item>
```

Expose the enum on the component class so the template can reference it:

```typescript
readonly MyKind = MyKind; // e.g. ContentKind, AssetKind
```

Register all icon variants in `provideIcons`:

```typescript
providers: [provideIcons({ lucideFolder, lucideFileText, lucidePaperclip })],
```

### Secondary text (slug / path) in combobox items

Show supplementary info (e.g. `fullSlug`) as a muted inline span **inside** the item, and include it in `displayItem` so the trigger shows it after selection:

```html
<hlm-combobox-item [value]="content">
  <ng-icon hlm size="sm" [name]="..." />
  {{ content.name }}
  <span class="text-muted-foreground text-xs">| {{ content.fullSlug }}</span>
</hlm-combobox-item>
```

```typescript
protected readonly displayItem = (item?: Content): string =>
  item ? `${item.name} | ${item.fullSlug}` : '';
```

### Client-side search (static list)

For static data (e.g. locales), use `[(search)]="search"` + `computed()` — no `[filter]` needed:

```typescript
search = signal('');
filteredItems = computed(() => {
  const s = this.search().trim().toLowerCase();
  return s ? this.items.filter(i => i.name.toLowerCase().includes(s)) : this.items;
});
```

### Imports

```typescript
imports: [..., HlmComboboxImports, HlmFieldImports, HlmIconImports],
```

---

## `matTextSuffix` → Inline-end Addon

`matTextSuffix` (static text rendered at the trailing edge of a Material input) maps to `hlm-input-group-addon align="inline-end"`. It can be combined with a character counter in the same addon:

```html
<!-- ❌ Before -->
<input matInput formControlName="name" />
<span matTextSuffix>.jpg</span>
<mat-hint align="end">{{ form.controls['name'].value?.length || 0 }}/250</mat-hint>

<!-- ✅ After — suffix and counter in one addon -->
<div hlmInputGroup>
  <input hlmInputGroupInput id="name" formControlName="name" maxlength="250" />
  <hlm-input-group-addon align="inline-end" class="text-muted-foreground text-xs">
    .jpg &bull; {{ form.controls['name'].value?.length || 0 }}/250
  </hlm-input-group-addon>
</div>
```

---

## File Upload Dialog Pattern

Replace `mat-stroked-button (click)="fileInput.click()"` + `<mat-icon>upload_file</mat-icon>` + `<mat-error>` with:

```html
<div class="flex items-center gap-3">
  <button hlmBtn variant="outline" type="button" (click)="fileInput.click()">
    <ng-icon hlm size="sm" name="lucideUpload" />
    Upload File
  </button>
  @if (fileName) {
    <p class="text-muted-foreground text-sm">{{ fileName }}</p>
  }
</div>
@if (fileWrong) {
  <p class="text-destructive text-sm">The selected file does not comply with import extension (<b>*.ext.zip</b>).</p>
}
<input hidden type="file" accept=".ext.zip" #fileInput (change)="onFileChange($event)" />
```

```typescript
imports: [..., HlmButtonImports, HlmIconImports],
providers: [provideIcons({ lucideUpload, lucideUploadCloud })],
```

Use `lucideUpload` on the Upload button and `lucideUploadCloud` on the dialog's Import confirm button.

---

## Simple Confirmation Export Dialogs

When an export dialog offers no filtering (export everything), strip all form/autocomplete logic and render a plain confirmation:

```html
<h2 mat-dialog-title>Export</h2>
<mat-dialog-content>
  <p class="text-muted-foreground text-sm py-2">All items will be exported.</p>
</mat-dialog-content>
<mat-dialog-actions align="end" class="flex gap-2">
  <button hlmBtn variant="outline" [mat-dialog-close]="undefined">Cancel</button>
  <button hlmBtn [mat-dialog-close]="{}">
    <ng-icon hlm size="sm" name="lucideCloudDownload" />
    Export
  </button>
</mat-dialog-actions>
```

The Export button returns `{}`. Callers that read `it?.path` receive `undefined`, which triggers a full export — no changes needed at the call site.

```typescript
// Minimal component — no form, no service injection
@Component({ imports: [MatDialogModule, HlmButtonImports, HlmIconImports], providers: [provideIcons({ lucideCloudDownload })] })
export class ExportDialogComponent {
  data = inject<ExportDialogModel>(MAT_DIALOG_DATA);
}
```

---

## `MatButtonToggleModule` → `hlm-toggle-group`

The toggle group uses two distinct selectors — the group wrapper and a directive on native `<button>` elements.

**❌ Wrong — `<hlm-toggle>` does not exist:**
```html
<hlm-toggle-group ...>
  <hlm-toggle value="squarish">...</hlm-toggle>
</hlm-toggle-group>
```

**✅ Correct — `hlmToggleGroupItem` attribute on `<button>`:**
```html
<hlm-toggle-group type="single" variant="outline" [value]="orientation()" (valueChange)="orientation.set($event)">
  <button hlmToggleGroupItem value="squarish" hlmTooltip="Squarish">
    <ng-icon hlm name="lucideSquare" />
  </button>
  <button hlmToggleGroupItem value="landscape" hlmTooltip="Landscape">
    <ng-icon hlm name="lucideMonitor" />
  </button>
  <button hlmToggleGroupItem value="portrait" hlmTooltip="Portrait">
    <ng-icon hlm name="lucideSmartphone" />
  </button>
</hlm-toggle-group>
```

Key rules:
- `hlm-toggle-group` is the container (`[hlmToggleGroup]` or `<hlm-toggle-group>`)
- Items are native `<button hlmToggleGroupItem value="...">` — no `<hlm-toggle>` component exists
- `type="single"` for single selection, `type="multiple"` for multi
- `variant="outline"` to match the Material outlined toggle appearance
- `(valueChange)` emits the raw `value` string (not an event object — unlike Material's `(change)="$event.value"`)
- Initial `undefined` value → nothing selected (matches Material's initial state)

**Imports required:**
```typescript
imports: [..., HlmToggleGroupImports, HlmTooltipImports, HlmIconImports],
providers: [provideIcons({ lucideSquare, lucideMonitor, lucideSmartphone })],
```

---

## `MatExpansionModule` → `hlm-accordion`

Replace `mat-accordion` / `mat-expansion-panel` with the `hlm-accordion` element selectors. The directive form (`div[hlmAccordion]`) also works but element selectors are preferred for consistency.

```html
<!-- ❌ Before -->
<mat-accordion [multi]="true">
  <mat-expansion-panel>
    <mat-expansion-panel-header>
      <mat-panel-title>Form : {{ form?.valid }}</mat-panel-title>
    </mat-expansion-panel-header>
    <pre>{{ form.value | json }}</pre>
  </mat-expansion-panel>
</mat-accordion>

<!-- ✅ After -->
<hlm-accordion type="multiple">
  <hlm-accordion-item>
    <hlm-accordion-trigger>Form : {{ form?.valid }}</hlm-accordion-trigger>
    <hlm-accordion-content>
      <pre>{{ form.value | json }}</pre>
    </hlm-accordion-content>
  </hlm-accordion-item>
</hlm-accordion>
```

- `[multi]="true"` → `type="multiple"` on `<hlm-accordion>`
- `mat-expansion-panel` → `<hlm-accordion-item>`
- `mat-panel-title` inside `mat-expansion-panel-header` → content of `<hlm-accordion-trigger>`
- Expansion body → `<hlm-accordion-content>`

**Import:** `HlmAccordionImports` from `@spartan-ng/helm/accordion`

---

## `MatCardModule` → `hlm-card`

Replace `mat-card` with `<hlm-card>` and its sub-elements. The Spartan card is a standard flex container; layout is controlled via Tailwind.

```html
<!-- ❌ Before -->
<mat-card appearance="outlined" class="cursor-pointer" (click)="selection.toggle(item)">
  <img ... />
  <mat-card-header>
    <mat-card-subtitle>{{ item.name }}</mat-card-subtitle>
  </mat-card-header>
  <mat-card-content>...</mat-card-content>
  <mat-card-actions align="end">
    <mat-checkbox ... />
  </mat-card-actions>
</mat-card>

<!-- ✅ After -->
<hlm-card class="cursor-pointer overflow-hidden pt-0" (click)="selection.toggle(item)">
  <img class="h-48 w-full object-cover" ... />
  <hlm-card-header class="p-2">
    <p class="line-clamp-1 text-sm">{{ item.name }}</p>
    <p class="text-muted-foreground text-xs">{{ item.subtitle }}</p>
  </hlm-card-header>
  <hlm-card-footer class="flex items-center justify-between p-2">
    <span class="text-xs">{{ item.date | date }}</span>
    <hlm-checkbox (click)="$event.stopPropagation()" [checked]="selection.isSelected(item)" (checkedChange)="selection.toggle(item)" />
  </hlm-card-footer>
</hlm-card>
```

Key rules:
- `pt-0` on `<hlm-card>` removes the default top padding so an image flush-fits to the card top
- `overflow-hidden` clips the image to the card's rounded corners
- Sub-elements: `<hlm-card-header>`, `<hlm-card-content>`, `<hlm-card-footer>`
- No `hlmCardSubtitle` / `hlmCardTitle` directives are needed — apply Tailwind classes directly to `<p>` tags inside the header

**Import:** `HlmCardImports` from `@spartan-ng/helm/card`

---

## Sticky Paginator in Dialogs

By default, `<mat-paginator>` placed inside `<mat-dialog-actions>` scrolls with the page. To make it stick to the bottom of a scrollable dialog content area, move the paginator **into** `<mat-dialog-content>` and apply the global `mat-paginator-sticky` class:

```html
<!-- ❌ Before — paginator in actions, scrolls away -->
<mat-dialog-content>
  <!-- table / list -->
</mat-dialog-content>
<mat-dialog-actions>
  <mat-paginator ... />
  <button mat-button>Close</button>
</mat-dialog-actions>

<!-- ✅ After — paginator sticky at bottom of content -->
<mat-dialog-content>
  <!-- table / list -->
  <mat-paginator class="mat-paginator-sticky" [length]="..." [pageSize]="..." (page)="..." />
</mat-dialog-content>
<mat-dialog-actions align="end" class="flex gap-2">
  <button hlmBtn variant="ghost" [mat-dialog-close]="undefined">Close</button>
</mat-dialog-actions>
```

The `mat-paginator-sticky` global class is defined in `src/styles/_mat-paginator.scss`:
```scss
.mat-paginator-sticky {
  position: sticky;
  bottom: 0;
  z-index: 10;
}
```

For tables already migrated to `<ll-paginator>` (`src/app/shared/components/paginator/`), the same behavior is available via the `sticky` input (default `false`) — the component applies the `ll-paginator-sticky` class (defined in `src/styles/_ll-paginator.scss`) to itself:
```html
<ll-paginator [sticky]="true" [length]="..." />
```

For migrating a whole `mat-table` (not just its paginator) off Material, see the dedicated [`MatTable` → `ll-table` Migration Guide](table-migration.md).

---

## Checklist for Migrating a Dialog

1. **Keep** `MatDialogModule` for the dialog frame (`mat-dialog-title`, `mat-dialog-content`, `mat-dialog-actions`, `[mat-dialog-close]`)
2. **Replace** all Material form elements with Spartan equivalents (see table above)
3. **Add** `HlmButtonImports`, `HlmFieldImports`, etc. to component `imports`; remove all `Mat*Module` form imports
4. **Form layout** → add `class="flex flex-col gap-4 py-2"` to `<form>`, remove `<br />` spacers
5. **Actions layout** → add `class="flex gap-2"` to `<mat-dialog-actions>`; use `variant="destructive"` on confirm buttons for destructive actions
6. **`mat-hint`** → `<hlm-field-description>`; **char counter on text input** → `hlmInputGroup` + `hlm-input-group-addon align="inline-end"`; **char counter on textarea** → `hlmInputGroup` + `hlmInputGroupTextarea` + `hlm-input-group-addon align="block-end"` with `hlm-input-group-text`
7. **Textarea** → use `hlmInputGroupTextarea` inside `<hlm-input-group>` (counter via `block-end` addon); use bare `hlmTextarea` only when there is no counter. Remove `HlmTextareaImports` when all textareas in the component use `hlmInputGroupTextarea`.
8. **Chips** → replace `mat-chip-grid` with `hlmInput` + `(keydown.enter)` + `hlmBtn` outline badges; use immutable `setValue` (never `push`/`splice`)
9. **Boolean checkbox** → use `hlm-switch` with `formControlName`; use `hlm-checkbox` only for multi-select lists
10. **Select with pre-selected value?** → Add `[itemToString]` mapping function (static `Record` or dynamic lookup from data)
11. **"None" option in select?** → Use `[value]="null"`, add `placeholder` to `<hlm-select-value>`
12. **Programmatic form patch with optional fields?** → Convert `undefined` → `null` in `patchValue`
13. **Checkbox with description?** → Use `div.grid.gap-1.5` + sibling `<p>`, not nested spans in `<label>`
14. **Field error?** → Use `<hlm-field-error>`, not `[hlmFieldError]` directive
15. **`matTextSuffix`?** → Combine with counter in one `hlm-input-group-addon align="inline-end"` (e.g. `.jpg • 12/250`)
16. **Autocomplete?** → Use `HlmComboboxImports` — **never** `HlmAutocompleteImports` (broken). Portal must be `<hlm-combobox-content *hlmComboboxPortal>`, not `<div *hlmComboboxPortal hlmComboboxContent>`.
17. **File upload?** → `hlmBtn variant="outline"` + `lucideUpload` + hidden `<input type="file">` + `@if (fileWrong)` error paragraph
18. **Export with no filter?** → Strip all form logic, return `{}` from confirm button; caller's `it?.path` resolves to `undefined` (full export)
19. **Button toggle group?** → `<hlm-toggle-group type="single" variant="outline">` with `<button hlmToggleGroupItem value="...">` children. **Never `<hlm-toggle>`** — that element does not exist.
20. **Accordion?** → `<hlm-accordion type="multiple">` with `<hlm-accordion-item>`, `<hlm-accordion-trigger>`, `<hlm-accordion-content>`. Use element selectors, not `div[hlmAccordion]`.
21. **Card grid?** → `<hlm-card class="overflow-hidden pt-0">` with `<hlm-card-header>` / `<hlm-card-footer>`. Apply Tailwind classes directly to `<p>` tags — no `hlmCardTitle`/`hlmCardSubtitle` directives needed.
22. **Paginator sticky at bottom of dialog?** → Move `<mat-paginator>` into `<mat-dialog-content>` with `class="mat-paginator-sticky"` (global class in `src/styles/_mat-paginator.scss`).
23. **Dead code blocks (`@if (false)`)** → remove them during migration
24. Run `npm run build && npm run lint:fix`
