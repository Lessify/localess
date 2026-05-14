# Spartan UI Migration Guide

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
| `MatSelectModule` | `hlm-select` + related | `HlmSelectImports` |
| `MatSlideToggleModule` | `hlm-switch` | `HlmSwitchImports` |
| `MatCheckboxModule` / `mat-selection-list` | `hlm-checkbox` | `HlmCheckboxImports` |
| `MatDividerModule` | `hlm-separator` | `HlmSeparatorImports` |
| `MatTooltipModule` | `hlmTooltip` directive | `HlmTooltipImports` |
| `MatSnackBar` | `toast` from `ngx-sonner` | see Notifications section |

---

## `hlm-checkbox` — Layout Pitfalls

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

## Checklist for Migrating a Dialog

1. **Keep** `MatDialogModule` for the dialog frame (`mat-dialog-title`, `mat-dialog-content`, `mat-dialog-actions`, `[mat-dialog-close]`)
2. **Replace** all Material form elements with Spartan equivalents (see table above)
3. **Add** `HlmButtonImports`, `HlmFieldImports`, etc. to component `imports`; remove all `Mat*Module` form imports
4. **Select with pre-selected value?** → Add `[itemToString]` mapping function
5. **"None" option in select?** → Use `[value]="null"`, add `placeholder` to `<hlm-select-value>`
6. **Programmatic form patch with optional fields?** → Convert `undefined` → `null` in `patchValue`
7. **Checkbox with description?** → Use `div.grid.gap-1.5` + sibling `<p>`, not nested spans in `<label>`
8. **Field error?** → Use `<hlm-field-error>`, not `[hlmFieldError]` directive
9. Run `npm run build && npm run lint:fix`
