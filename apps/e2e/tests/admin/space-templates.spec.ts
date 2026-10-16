import { AdminSpacesPage } from '../pages/admin-spaces.page';
import { dialog } from '../pages/dialogs';
import { expectToast } from '../pages/notifications';
import { SchemasPage } from '../pages/schemas.page';
import type { AppApi } from '../support/app-api';
import { expect, test, uniqueName } from '../support/fixtures';

// Create Space → Template: the space starts with the template's schemas (written by the server in one go).
// Pre-check → action (UI) → post-check (the API, the Schemas page, a document from a template schema).
const TEMPLATES = {
  Empty: [],
  'E-Commerce': ['category', 'product', 'size', 'variant'],
  Blog: ['author', 'blogpost', 'blogtag', 'category'],
  'Marketing Site': ['cta', 'feature', 'featuregrid', 'hero', 'page', 'testimonial'],
} as const;

async function schemaNames(api: AppApi, spaceId: string): Promise<string[]> {
  const schemas = await api.get<{ name: string }[]>(`/api/app/spaces/${spaceId}/schemas`);
  return schemas.map(it => it.name).sort();
}

test.describe('Admin → Spaces → templates', () => {
  for (const [template, expected] of Object.entries(TEMPLATES)) {
    test(`creates a space from the ${template} template`, async ({ page, api, cleanup }) => {
      const spaces = new AdminSpacesPage(page);
      const name = uniqueName('E2E Template');
      cleanup.space(name);

      // Pre-check
      await spaces.goto();
      const form = await spaces.openCreate(name);
      // Empty is the default.
      await expect(form.getByRole('radio', { name: /^Empty/ })).toBeChecked();

      // Action
      await form
        .locator(`label`)
        .filter({ hasText: new RegExp(`^\\s*${template}`) })
        .click();
      await expect(form.getByRole('radio', { name: new RegExp(`^${template}`) })).toBeChecked();
      await form.getByRole('button', { name: 'Create' }).click();
      await expect(form).toBeHidden();
      await expectToast(page, 'Space has been created.');

      // Post-check: the template's schemas, complete.
      await expect(spaces.row(name)).toBeVisible();
      const id = await spaces.idOf(name);
      await expect.poll(() => schemaNames(api, id)).toEqual([...expected]);
      if (expected.length === 0) return;
      const schemas = new SchemasPage(page);
      await schemas.goto(id);
      for (const schema of expected) await expect(schemas.row(schema)).toBeVisible();
    });
  }

  test('the Blog template gives a complete Root schema to create posts with', async ({ page, api, cleanup }) => {
    const spaces = new AdminSpacesPage(page);
    const name = uniqueName('E2E Blog');
    cleanup.space(name);
    await spaces.goto();
    const form = await spaces.openCreate(name);
    await form
      .locator('label')
      .filter({ hasText: /^\s*Blog/ })
      .click();
    await form.getByRole('button', { name: 'Create' }).click();
    await expectToast(page, 'Space has been created.');
    const id = await spaces.idOf(name);
    await expect.poll(() => schemaNames(api, id)).toContain('blogpost');

    // The ROOT schema has its fields, and documents can be created with it.
    const post = await api.get<{ fields?: { name: string; kind: string }[]; type: string }>(
      `/api/app/spaces/${id}/schemas/${(await api.get<{ id: string; name: string }[]>(`/api/app/spaces/${id}/schemas`)).find(it => it.name === 'blogpost')!.id}`,
    );
    expect(post.type).toBe('ROOT');
    expect(post.fields?.length).toBeGreaterThan(2);
    await api.createDocument(id, { name: 'Hello', slug: 'hello', schema: 'blogpost' });
  });

  test('a user who can not create schemas is not offered templates', async ({ createUser, signInAs, cleanup }) => {
    const user = await createUser({ permissions: ['SPACE_MANAGEMENT'] });
    const own = await signInAs(user);
    const name = uniqueName('E2E No Template');
    cleanup.space(name);
    await own.goto('/features/admin/spaces');
    await own.getByRole('button', { name: 'Add Space' }).click();
    const form = await dialog(own, 'Create Space');
    await form.getByLabel('Name', { exact: true }).fill(name);
    await expect(form.getByText('Template', { exact: true })).toHaveCount(0);
    await expect(form.getByRole('radio')).toHaveCount(0);
    await form.getByRole('button', { name: 'Create' }).click();
    await expectToast(own, 'Space has been created.');
  });
});
