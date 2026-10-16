import { expectToast } from '../pages/notifications';
import { SchemasPage } from '../pages/schemas.page';
import { expect, test, uniqueId } from '../support/fixtures';
import { schemaNamed, schemasOf } from '../support/schemas';

// Pre-check → action (UI) → post-check (the list, the editor, after a reload, the App API).
test.describe('Schemas → create', () => {
  test('creates a Root, a Node and an Enum schema; each opens its editor @smoke', async ({ page, api, space }) => {
    const schemas = new SchemasPage(page);

    // Pre-check
    await schemas.goto(space.id);
    await expect(schemas.empty).toBeVisible();

    // Action → post-check, per type.
    for (const [type, apiType, editor] of [
      ['Root', 'ROOT', 'comp'],
      ['Node', 'NODE', 'comp'],
      ['Enum', 'ENUM', 'enum'],
    ] as const) {
      const name = `My${type}`;
      await schemas.create({ displayName: `My ${type}`, type });
      await expect(schemas.row(name)).toContainText(type);
      expect(await schemaNamed(api, space.id, name)).toMatchObject({ type: apiType, displayName: `My ${type}` });
      await schemas.open(name);
      await expect(page).toHaveURL(new RegExp(`/schemas/${editor}/`));
      await expect(page.getByRole('tab', { name: editor === 'enum' ? 'Values' : 'Fields' })).toBeVisible();
      await schemas.goto(space.id);
    }
    await page.reload();
    await expect(schemas.rows).toHaveCount(3);
  });

  test('the ID follows the display name until edited, and can be normalized', async ({ page, api, space }) => {
    const schemas = new SchemasPage(page);
    await schemas.goto(space.id);

    // Pre-check → action: typing a display name fills the ID.
    const form = await schemas.openCreate({ displayName: 'Landing Page' });
    const id = form.getByLabel('ID', { exact: true });
    await expect(id).toHaveValue('LandingPage');

    // Once edited, the ID stays; Normalize turns it into a valid one.
    await id.fill('my landing-page');
    await form.getByLabel('Display Name').fill('Something else');
    await expect(id).toHaveValue('my landing-page');
    await form.getByRole('button', { name: 'Normalize ID' }).click();
    const normalized = await id.inputValue();
    expect(normalized).toMatch(/^[a-zA-Z][a-zA-Z0-9]+$/);
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
    await expectToast(page, 'Schema has been created.');

    // Post-check
    expect(await schemaNamed(api, space.id, normalized)).toMatchObject({ displayName: 'Something else' });
  });

  test('refuses an ID that exists', async ({ page, api, space }) => {
    const name = uniqueId('Page');
    await api.createSchema(space.id, { name, type: 'ROOT', displayName: 'Original' });
    const schemas = new SchemasPage(page);

    // Pre-check
    await schemas.goto(space.id);
    await expect(schemas.row(name)).toHaveCount(1);

    // Action
    const form = await schemas.openCreate({ displayName: 'Copy', id: name, type: 'Root' });
    await form.getByLabel('ID', { exact: true }).blur();

    // Post-check
    await expect(form.getByText('The value is already reserved.')).toBeVisible();
    await expect(form.getByRole('button', { name: 'Save' })).toBeDisabled();
    await form.getByRole('button', { name: 'Cancel' }).click();
    expect((await schemasOf(api, space.id)).filter(it => it.name === name)).toHaveLength(1);
    expect(await schemaNamed(api, space.id, name)).toMatchObject({ displayName: 'Original' });
  });

  test('refuses invalid and reserved IDs; cancelling creates nothing', async ({ page, api, space }) => {
    const schemas = new SchemasPage(page);
    await schemas.goto(space.id);

    // Pre-check: a valid ID can be saved.
    const form = await schemas.openCreate({ displayName: 'Valid', type: 'Node' });
    const id = form.getByLabel('ID', { exact: true });
    await expect(form.getByRole('button', { name: 'Save' })).toBeEnabled();

    // Action → post-check, for each invalid ID.
    for (const invalid of ['Content', 'Translations', '1Page', 'P', 'with space', 'with-dash', 'with_underscore']) {
      await id.fill(invalid);
      await id.blur();
      await expect(form.getByRole('button', { name: 'Save' }), invalid).toBeDisabled();
      await expect(form.locator('hlm-field-error').first(), invalid).toBeVisible();
    }

    // Cancel
    await form.getByRole('button', { name: 'Cancel' }).click();
    await expect(form).toBeHidden();
    await expect(schemas.empty).toBeVisible();
    expect(await schemasOf(api, space.id)).toEqual([]);
  });
});
