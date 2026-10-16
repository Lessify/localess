import { expect, type Locator, type Page } from '@playwright/test';

import { choose, dialog, expectRowMenu, rowMenu } from './dialogs';
import { confirmDialog, expectToast } from './notifications';

export type SchemaTypeLabel = 'Root' | 'Node' | 'Enum';

/** Kind labels of the Edit Field panel's "Kind" select. */
export type FieldKindLabel =
  | 'Text'
  | 'Text Area'
  | 'Rich Text'
  | 'Markdown'
  | 'Number'
  | 'Color'
  | 'Date'
  | 'Date and Time'
  | 'Boolean'
  | 'Option (One)'
  | 'Options (Multiple)'
  | 'Link'
  | 'Reference (One)'
  | 'References (Multiple)'
  | 'Asset (One)'
  | 'Assets (Multiple)'
  | 'Schema (One)'
  | 'Schemas (Multiple)';

export interface FieldInput {
  kind?: FieldKindLabel;
  displayName?: string;
  required?: boolean;
  translatable?: boolean;
  description?: string;
  /** For Option / Options: the enum schema's name. */
  source?: string;
  /** For Schema / Schemas: allowed node schemas, by the display name the picker shows. */
  schemas?: string[];
}

/**
 * Space → Schemas: the list (`/schemas`), the Root/Node editor (`/schemas/comp/:id`) and the Enum editor
 * (`/schemas/enum/:id`). Changes in the editors are kept only on Save.
 */
export class SchemasPage {
  constructor(private readonly page: Page) {}

  // --- List ----------------------------------------------------------------------------------------------------------

  async goto(spaceId: string): Promise<void> {
    await this.page.goto(`/features/spaces/${spaceId}/schemas`);
    await expect(this.page.getByRole('button', { name: 'Add Schema' })).toBeVisible();
  }

  /** A row, by the schema name (the list shows `#name`). */
  row(name: string): Locator {
    // The name cell ends with `#name` (the display name comes first).
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell').filter({ hasText: new RegExp(`#${name}\\s*$`) }) });
  }

  get rows(): Locator {
    return this.page.locator('tr[ll-row]');
  }

  get empty(): Locator {
    return this.page.getByText('No schemas yet.');
  }

  /** Opens "Create new Schema" and fills it, without saving. `id` unset: keeps the one made from the display name. */
  async openCreate(input: { displayName: string; id?: string; type?: SchemaTypeLabel }): Promise<Locator> {
    await this.page.getByRole('button', { name: 'Add Schema' }).click();
    const form = await dialog(this.page, 'Create new Schema');
    await form.getByLabel('Display Name').fill(input.displayName);
    if (input.id !== undefined) await form.getByLabel('ID', { exact: true }).fill(input.id);
    if (input.type) await choose(this.page, form.locator('#type'), input.type);
    return form;
  }

  async create(input: { displayName: string; id?: string; type: SchemaTypeLabel }): Promise<void> {
    const form = await this.openCreate(input);
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'Schema has been created.');
  }

  /** Opens a schema's editor from the list. */
  async open(name: string): Promise<void> {
    await this.row(name).click();
    await expect(this.page).toHaveURL(/\/schemas\/(comp|enum)\/[0-9a-f-]{36}$/);
    await expect(this.page.getByText(`#`, { exact: false }).first()).toBeVisible();
  }

  /** Opens "Edit Schema ID" from the row menu and fills it, without saving. */
  async openEditId(name: string, newName: string): Promise<Locator> {
    await rowMenu(this.page, this.row(name), 'Edit ID');
    const form = await dialog(this.page, 'Edit Schema ID');
    await form.getByLabel('Id', { exact: true }).fill(newName);
    return form;
  }

  async editId(name: string, newName: string): Promise<void> {
    const form = await this.openEditId(name, newName);
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'Schema ID has been updated.');
  }

  async delete(name: string): Promise<void> {
    await rowMenu(this.page, this.row(name), 'Delete');
    await confirmDialog(this.page, 'Delete Schema');
    await expectToast(this.page, `Schema '${name}' has been deleted.`);
  }

  /** Checks the row menu's items (Edit ID, Delete) enabled or disabled. */
  async expectMenu(name: string, enabled: boolean): Promise<void> {
    await expectRowMenu(this.page, this.row(name), async menu => {
      for (const item of ['Edit ID', 'Delete']) {
        const locator = menu.getByRole('menuitem', { name: item });
        await (enabled ? expect(locator).toBeEnabled({ timeout: 1_000 }) : expect(locator).toBeDisabled({ timeout: 1_000 }));
      }
    });
    await this.page.keyboard.press('Escape');
  }

  async search(text: string): Promise<void> {
    await this.page.getByPlaceholder('Search...').fill(text);
  }

  async filterLabel(label: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Labels' }).click();
    await this.page.getByRole('option', { name: label, exact: true }).click();
    await this.page.keyboard.press('Escape');
  }

  async resetFilters(): Promise<void> {
    await this.page.getByRole('button', { name: 'Reset' }).click();
  }

  // --- Editors (shared) ----------------------------------------------------------------------------------------------

  async gotoEditor(spaceId: string, schema: { id: string }, kind: 'comp' | 'enum' = 'comp'): Promise<void> {
    await this.page.goto(`/features/spaces/${spaceId}/schemas/${kind}/${schema.id}`);
    await expect(this.saveButton).toBeVisible();
  }

  get saveButton(): Locator {
    return this.page.getByRole('button', { name: /^Save/ });
  }

  async save(): Promise<void> {
    await this.saveButton.click();
    await expectToast(this.page, 'Schema has been updated.');
  }

  async tab(name: 'Fields' | 'Values' | 'Settings'): Promise<void> {
    await this.page.getByRole('tab', { name }).click();
  }

  /** The editor's item rows (fields of a Root/Node, values of an Enum), by `#name`. */
  item(name: string): Locator {
    // Matched in the row's title: the whole row's text runs `#name` into its badges ("#titleText").
    return this.page.getByRole('listitem').filter({ has: this.page.locator('[hlmItemTitle]', { hasText: new RegExp(`#${name}\\s*$`) }) });
  }

  /** The `#names` of the editor's rows, in order (read once: wrap in `expect.poll` after a reload). */
  async itemNames(): Promise<string[]> {
    const titles = await this.page.locator('[cdkDropList] [role="listitem"] [hlmItemTitle]').allInnerTexts();
    return titles.map(it => (it.match(/#(\S+)/) ?? [])[1] ?? it.trim());
  }

  get sheetTitle(): Locator {
    return this.page.getByRole('heading', { name: /^Edit (Field|Value)$/ });
  }

  /** Closes the panel with its Close button (Escape in a focused combobox clears its value instead). */
  async closeSheet(): Promise<void> {
    await this.page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(this.sheetTitle).toBeHidden();
  }

  /** The open side panel (Edit Field / Edit Value): the nearest ancestor of its title that holds the form. */
  get sheet(): Locator {
    return this.sheetTitle.locator('xpath=ancestor::*[.//input[@id="name"]][1]');
  }

  // --- Root/Node editor: fields --------------------------------------------------------------------------------------

  get newFieldInput(): Locator {
    return this.page.getByPlaceholder('Name of the new field...');
  }

  /** Adds a field (Text by default) and leaves its Edit Field panel open. */
  async addField(name: string): Promise<void> {
    await this.newFieldInput.fill(name);
    await this.page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(this.sheetTitle).toHaveText('Edit Field');
  }

  /** Opens a field's Edit Field panel and sets what is given, then closes it. */
  async editField(name: string, input: FieldInput): Promise<void> {
    if (!(await this.sheetTitle.isVisible())) await this.item(name).click();
    await expect(this.sheetTitle).toHaveText('Edit Field');
    const sheet = this.sheet;
    if (input.kind) await choose(this.page, sheet.locator('#kind'), input.kind);
    if (input.displayName !== undefined) await sheet.getByLabel('Display Name').fill(input.displayName);
    if (input.description !== undefined) await sheet.getByLabel('Description').fill(input.description);
    if (input.required !== undefined) await this.setSwitch(sheet, 'required', input.required);
    if (input.translatable !== undefined) await this.setSwitch(sheet, 'translatable', input.translatable);
    if (input.source) await choose(this.page, sheet.locator('#source'), new RegExp(`${input.source}`));
    for (const schema of input.schemas ?? []) {
      // A click while the list is still opening is lost: retried until the chip is there.
      await expect(async () => {
        await sheet.locator('#schemas input').click();
        await this.page.getByRole('option', { name: new RegExp(schema) }).click({ timeout: 2_000 });
        await expect(sheet.locator('hlm-combobox-chip').filter({ hasText: schema })).toBeVisible({ timeout: 1_000 });
      }).toPass({ timeout: 15_000 });
    }
    await this.closeSheet();
  }

  private async setSwitch(sheet: Locator, id: string, on: boolean): Promise<void> {
    const control = sheet.locator(`[id="${id}"]`);
    if ((await control.getAttribute('aria-checked')) !== String(on)) await sheet.locator(`label[for="${id}"]`).click();
    await expect(control).toHaveAttribute('aria-checked', String(on));
  }

  async deleteField(name: string): Promise<void> {
    await this.item(name).getByRole('button', { name: 'Delete' }).click();
    await expect(this.item(name)).toHaveCount(0);
  }

  /**
   * Drags a row by its handle to just above another row, so it takes that row's place (CDK drag and drop). Retried
   * until the order shows it: a drag that starts while the list is still re-rendering is lost.
   */
  async moveField(name: string, onto: string): Promise<void> {
    await expect(async () => {
      const handle = await this.item(name).getByRole('button', { name: 'Move' }).boundingBox();
      const target = await this.item(onto).boundingBox();
      if (!handle || !target) throw new Error(`can not drag ${name} onto ${onto}`);
      await this.page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
      await this.page.mouse.down();
      // CDK starts dragging after a few pixels, then sorts by the pointer's position.
      await this.page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2 - 10, { steps: 5 });
      await this.page.mouse.move(target.x + target.width / 2, target.y + 2, { steps: 15 });
      await this.page.mouse.up();
      // The new order shows a moment after the drop; only a drag that did nothing is retried (a second one would
      // move the row back).
      await expect
        .poll(
          async () => {
            const names = await this.itemNames();
            return names.indexOf(name) < names.indexOf(onto);
          },
          { timeout: 3_000 },
        )
        .toBe(true);
    }).toPass({ timeout: 20_000 });
  }

  // --- Settings tab --------------------------------------------------------------------------------------------------

  get settings(): Locator {
    return this.page.getByRole('tabpanel');
  }

  async addSettingsLabel(label: string): Promise<void> {
    const input = this.page.getByPlaceholder('Enter new label name');
    await input.fill(label);
    await input.press('Enter');
  }

  // --- Enum editor: values -------------------------------------------------------------------------------------------

  /** Adds an enum value (name and value both set to `name`) and leaves its Edit Value panel open. */
  async addValue(name: string): Promise<void> {
    const input = this.page.getByPlaceholder('Name of the new element...');
    await input.fill(name);
    await this.page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(this.sheetTitle).toHaveText('Edit Value');
  }

  async editValue(name: string, input: { displayName?: string; value?: string }): Promise<void> {
    if (!(await this.sheetTitle.isVisible())) await this.item(name).click();
    await expect(this.sheetTitle).toHaveText('Edit Value');
    if (input.displayName !== undefined) await this.sheet.getByLabel('Display Name').fill(input.displayName);
    if (input.value !== undefined) await this.sheet.getByLabel('Value', { exact: true }).fill(input.value);
    await this.closeSheet();
  }
}
