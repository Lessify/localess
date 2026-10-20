import { AdminSpacesPage } from '../pages/admin-spaces.page';
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

      // Pre-check (the table narrowed to the new name: one page is listed)
      await spaces.goto(name);
      const form = await spaces.openCreate(name);
      // Empty is the default.
      await expect(form.getByRole('radio', { name: /^Empty/ })).toBeChecked();

      // Action
      await spaces.chooseTemplate(form, template);
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
    await spaces.goto(name);
    const form = await spaces.openCreate(name);
    await spaces.chooseTemplate(form, 'Blog');
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
    const doc = await api.createDocument(id, { name: 'Hello', slug: 'hello', schema: 'blogpost' });
    expect(await api.get(`/api/app/spaces/${id}/contents/${doc.id}`)).toMatchObject({ name: 'Hello', schema: 'blogpost' });
  });

  test("creating a space, from a template or not, is an admin's: a developer is sent back", async ({ createUser, signInAs }) => {
    const user = await createUser({ role: 'DEVELOPER' });
    const own = await signInAs(user);
    await own.goto('/features/admin/spaces?action=create');
    await expect(own).not.toHaveURL(/\/admin\/spaces/);
    await expect(own.getByRole('dialog')).toHaveCount(0);
    expect((await own.request.get('/api/app/spaces/templates')).status()).toBe(403);
  });
});
