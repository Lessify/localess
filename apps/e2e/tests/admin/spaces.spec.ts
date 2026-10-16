import { AdminSpacesPage } from '../pages/admin-spaces.page';
import { cancel } from '../pages/dialogs';
import { Shell } from '../pages/shell.page';
import { expect, test, uniqueName } from '../support/fixtures';

// Every test: pre-check (UI and API) → action (UI) → post-check (UI, again after a reload, and API).
test.describe('Admin → Spaces', () => {
  test.describe('create', () => {
    test('creates a space, which then opens and shows in the space switcher @smoke', async ({ page, api, cleanup, space }) => {
      const spaces = new AdminSpacesPage(page);
      const name = uniqueName('E2E Space');
      cleanup.space(name);

      // Pre-check: the name is not taken.
      await spaces.goto();
      await expect(spaces.row(name)).toHaveCount(0);
      expect((await api.listSpaces()).map(it => it.name)).not.toContain(name);

      // Action
      await spaces.create(name);

      // Post-check: in the table (also after a reload), in the API, and usable.
      await expect(spaces.row(name)).toBeVisible();
      const id = await spaces.idOf(name);
      expect(await api.findSpace(id)).toMatchObject({ id, name });
      await page.reload();
      await expect(spaces.row(name)).toBeVisible();
      await page.goto(`/features/spaces/${id}/settings/general`);
      await expect(page.getByRole('button', { name })).toBeVisible();
      // Another space (the test's own: names like "Hello World" can repeat, e.g. after `admin:create`).
      await new Shell(page).switchSpace(space.name);
      await expect(page.getByRole('button', { name: space.name })).toBeVisible();
    });

    test('cancelling the dialog creates nothing', async ({ page, api }) => {
      const spaces = new AdminSpacesPage(page);
      const name = uniqueName('E2E Cancel');

      // Pre-check
      await spaces.goto();
      expect((await api.listSpaces()).map(it => it.name)).not.toContain(name);

      // Action
      const form = await spaces.openCreate(name);
      await form.getByRole('button', { name: 'Cancel' }).click();
      await expect(form).toBeHidden();

      // Post-check
      await expect(spaces.row(name)).toHaveCount(0);
      expect((await api.listSpaces()).map(it => it.name)).not.toContain(name);
    });

    test('refuses a name shorter than 3 characters', async ({ page, api }) => {
      const spaces = new AdminSpacesPage(page);
      await spaces.goto();

      // Pre-check: the dialog accepts a valid name.
      const form = await spaces.openCreate('Valid name');
      await expect(form.getByRole('button', { name: 'Create' })).toBeEnabled();

      // Action
      await form.getByLabel('Name', { exact: true }).fill('ab');
      await form.getByLabel('Name', { exact: true }).blur();

      // Post-check: an error, and no way to submit.
      await expect(form.getByText('Minimum length is 3.')).toBeVisible();
      await expect(form.getByRole('button', { name: 'Create' })).toBeDisabled();
      await cancel(form);
      await expect(spaces.row('ab')).toHaveCount(0);
      // Other tests create spaces at the same time: only "ab" is checked.
      expect((await api.listSpaces()).filter(it => it.name === 'ab')).toEqual([]);
    });
  });

  test.describe('edit', () => {
    test('renames a space', async ({ page, api, space }) => {
      const spaces = new AdminSpacesPage(page);
      const newName = uniqueName('E2E Renamed');

      // Pre-check: listed under its name.
      await spaces.goto();
      await expect(spaces.row(space.name)).toBeVisible();
      expect(await api.findSpace(space.id)).toMatchObject({ name: space.name });

      // Action
      await spaces.rename(space.name, newName);

      // Post-check: the new name everywhere, the old one nowhere; same id.
      await expect(spaces.row(newName)).toBeVisible();
      await expect(spaces.row(space.name)).toHaveCount(0);
      expect(await spaces.idOf(newName)).toBe(space.id);
      expect(await api.findSpace(space.id)).toMatchObject({ name: newName });
      await page.reload();
      await expect(spaces.row(newName)).toBeVisible();
      await expect(spaces.row(space.name)).toHaveCount(0);
    });

    test('cancelling the edit keeps the name', async ({ page, api, space }) => {
      const spaces = new AdminSpacesPage(page);

      // Pre-check
      await spaces.goto();
      await expect(spaces.row(space.name)).toBeVisible();

      // Action
      const form = await spaces.openRename(space.name, 'Not saved');
      await form.getByRole('button', { name: 'Cancel' }).click();
      await expect(form).toBeHidden();

      // Post-check
      await expect(spaces.row(space.name)).toBeVisible();
      await expect(spaces.row('Not saved')).toHaveCount(0);
      expect(await api.findSpace(space.id)).toMatchObject({ name: space.name });
    });
  });

  test.describe('delete', () => {
    test('deletes a space with its content', async ({ page, api, space, request }) => {
      await api.createTranslation(space.id, { key: 'gone.with.space', locales: { en: 'Bye' } });
      await api.publishTranslations(space.id);
      const { token } = await api.createToken(space.id, { name: 'Website', type: 'public' });
      const cdn = () => request.get(`/api/v1/spaces/${space.id}/translations/en?token=${token}`);
      const spaces = new AdminSpacesPage(page);

      // Pre-check: listed, readable, with content.
      await spaces.goto();
      await expect(spaces.row(space.name)).toBeVisible();
      expect(await api.findSpace(space.id)).toBeDefined();
      expect(await api.get<unknown[]>(`/api/app/spaces/${space.id}/translations`)).toHaveLength(1);
      expect((await cdn()).status()).toBe(200);

      // Action
      await spaces.delete(space.name);

      // Post-check: gone from the table (also after a reload) and from the API.
      await expect(spaces.row(space.name)).toHaveCount(0);
      expect(await api.findSpace(space.id)).toBeUndefined();
      // Its content went with it, and the CDN no longer finds the space.
      expect(await api.get(`/api/app/spaces/${space.id}/translations`)).toEqual([]);
      expect((await cdn()).status()).toBe(404);
      await page.reload();
      // Loaded (the seeded space is listed; the CLI test may add a second one for a moment).
      await expect(spaces.row('Hello World').first()).toBeVisible();
      await expect(spaces.row(space.name)).toHaveCount(0);
    });

    test('cancelling the confirmation keeps the space', async ({ page, api, space }) => {
      const spaces = new AdminSpacesPage(page);

      // Pre-check
      await spaces.goto();
      await expect(spaces.row(space.name)).toBeVisible();

      // Action
      await spaces.row(space.name).getByRole('button', { name: 'Delete' }).click();
      const confirm = page.getByRole('dialog').filter({ hasText: 'Delete Space' });
      await confirm.getByRole('button', { name: 'Cancel' }).click();
      await expect(confirm).toBeHidden();

      // Post-check
      await expect(spaces.row(space.name)).toBeVisible();
      expect(await api.findSpace(space.id)).toBeDefined();
    });
  });
});
