import { SchemasPage } from '../pages/schemas.page';
import { expect, test, uniqueId } from '../support/fixtures';
import { createEnum, schemaNamed } from '../support/schemas';

// Pre-check → action (Values tab, then Save) → post-check (after a reload, the App API).
test.describe('Schemas → enum values', () => {
  test('adds, edits, deletes and reorders values @smoke', async ({ page, api, space }) => {
    const name = uniqueId('Colors');
    const schema = await api.createSchema(space.id, { name, type: 'ENUM' });
    const schemas = new SchemasPage(page);

    // Pre-check: no values.
    await schemas.gotoEditor(space.id, schema, 'enum');
    expect(await schemas.itemNames()).toEqual([]);

    // Action: add three (name and value both from the input), edit one, delete one, move one.
    for (const value of ['red', 'green', 'blue']) {
      await schemas.addValue(value);
      await schemas.closeSheet();
    }
    await schemas.editValue('green', { displayName: 'Green', value: 'green_01' });
    await schemas.deleteField('blue');
    // Enum rows show `#value`.
    await schemas.moveField('green_01', 'red');
    await schemas.save();

    // Post-check
    await page.reload();
    await expect.poll(() => schemas.itemNames()).toEqual(['green_01', 'red']);
    expect((await schemaNamed(api, space.id, name))?.values).toEqual([
      { name: 'Green', value: 'green_01' },
      { name: 'red', value: 'red' },
    ]);
  });

  test('refuses a value name that exists and a value with spaces', async ({ page, api, space }) => {
    const name = uniqueId('Sizes');
    const schema = await createEnum(api, space.id, name, [{ name: 'Small', value: 'small' }]);
    const schemas = new SchemasPage(page);
    await schemas.gotoEditor(space.id, schema, 'enum');
    const add = page.getByRole('button', { name: 'Add', exact: true });
    const input = page.getByPlaceholder('Name of the new element...');

    // Action → post-check: a name that exists can't be added.
    await input.fill('Small');
    await input.blur();
    await expect(add).toBeDisabled();

    // Action → post-check: a value with spaces makes the schema unsavable.
    await schemas.addValue('Extra Large');
    await schemas.closeSheet();
    // The invalid row is only marked visually (no accessible state): checked by its class.
    await expect(schemas.item('Extra Large')).toHaveClass(/border-destructive/);
    await expect(schemas.saveButton).toBeDisabled();
    await schemas.editValue('Extra Large', { value: 'extra_large' });
    await expect(schemas.saveButton).toBeEnabled();
    await schemas.save();
    expect((await schemaNamed(api, space.id, name))?.values).toEqual([
      { name: 'Small', value: 'small' },
      { name: 'Extra Large', value: 'extra_large' },
    ]);
  });
});
