import { ContentsPage } from '../pages/contents.page';
import { expectToast } from '../pages/notifications';
import { Cdn, contentById, pageSchema } from '../support/contents';
import { expect, test } from '../support/fixtures';

// Pre-check → action (the editor) → post-check (the editor and the list status, the App API, the CDN API: the
// published version for a public token, the draft for a preview token).
test.describe('Contents → document lifecycle', () => {
  test('status goes Not published → Published → Draft; the CDN keeps the published version until Publish @smoke', async ({
    page,
    api,
    space,
    request,
  }) => {
    const schema = await pageSchema(api, space);
    const doc = await api.createDocument(space.id, { name: 'Home', slug: 'home', schema: schema.name });
    const cdn = new Cdn(request, api, space.id);
    const contents = new ContentsPage(page);
    const status = (name: 'Published' | 'Draft' | 'Not published') => page.getByRole('img', { name, exact: true });

    // Pre-check: never published.
    await contents.gotoDocument(space.id, doc.id);
    await expect(status('Not published')).toBeVisible();
    expect((await cdn.get({ id: doc.id })).status).toBe(404);

    // Action 1: save and publish.
    await contents.field('Title').fill('Version 1');
    await contents.save();
    expect((await cdn.get({ id: doc.id })).status).toBe(404);
    await contents.publish();
    await expect(status('Published')).toBeVisible();
    expect((await cdn.get({ id: doc.id })).body?.data).toMatchObject({ title: 'Version 1' });

    // Action 2: edit and save only. Post-check: Draft; public sees v1, preview sees v2.
    await contents.field('Title').fill('Version 2');
    await contents.save();
    await expect(status('Draft')).toBeVisible();
    // The second save's toast reads like the first: wait for the stored value.
    await expect.poll(async () => (await contentById(api, space.id, doc.id)).data?.title).toBe('Version 2');
    expect((await cdn.get({ id: doc.id })).body?.data).toMatchObject({ title: 'Version 1' });
    expect((await cdn.get({ id: doc.id }, { version: 'draft' })).body?.data).toMatchObject({ title: 'Version 2' });

    // Action 3: publish again. Post-check, also in the list.
    await contents.publish();
    await expect.poll(async () => (await cdn.get({ id: doc.id })).body?.data.title).toBe('Version 2');
    await contents.goto(space.id);
    await expect(contents.status('Home', 'Published')).toBeVisible();
  });

  test('unpublish takes it off the CDN and keeps the draft', async ({ page, api, space, request }) => {
    const schema = await pageSchema(api, space);
    const doc = await api.createDocument(space.id, { name: 'Home', slug: 'home', schema: schema.name });
    await api.saveDocumentData(space.id, doc, { title: 'Kept' });
    await api.publishContent(space.id, doc.id);
    const cdn = new Cdn(request, api, space.id);
    const contents = new ContentsPage(page);

    // Pre-check
    await contents.gotoDocument(space.id, doc.id);
    expect((await cdn.get({ slug: 'home' })).status).toBe(200);

    // Action
    await page.getByRole('button', { name: 'More Options' }).click();
    await page.getByRole('menuitem', { name: 'Unpublish' }).click();
    await expectToast(page, 'Content has been unpublished.');

    // Post-check
    expect((await cdn.get({ slug: 'home' })).status).toBe(404);
    expect((await contentById(api, space.id, doc.id)).data).toMatchObject({ title: 'Kept' });
    await page.reload();
    await expect(contents.field('Title')).toHaveValue('Kept');
    await expect(page.getByRole('img', { name: 'Not published', exact: true })).toBeVisible();
  });

  test('Ctrl+S saves; leaving with unsaved changes asks; a reload keeps what was saved', async ({ page, api, space }) => {
    const schema = await pageSchema(api, space);
    const doc = await api.createDocument(space.id, { name: 'About', slug: 'about', schema: schema.name });
    const contents = new ContentsPage(page);

    // Pre-check
    await contents.gotoDocument(space.id, doc.id);

    // Action: Ctrl+S. Post-check.
    await contents.field('Title').fill('Saved by keyboard');
    await page.keyboard.press('Control+s');
    await expectToast(page, 'Content has been saved in draft.');
    expect((await contentById(api, space.id, doc.id)).data).toMatchObject({ title: 'Saved by keyboard' });

    // Action: change, try to leave, stay. Post-check.
    await contents.field('Title').fill('Not saved');
    let message = '';
    page.once('dialog', dialog => {
      message = dialog.message();
      void dialog.dismiss();
    });
    await page.getByRole('button', { name: 'Back to Contents' }).click();
    expect(message).toContain('unsaved changes');
    await expect(page).toHaveURL(new RegExp(`/contents/${doc.id}$`));
    await expect(contents.field('Title')).toHaveValue('Not saved');

    // Leave anyway: the saved value is what comes back.
    page.once('dialog', dialog => void dialog.accept());
    await page.getByRole('button', { name: 'Back to Contents' }).click();
    await expect(page).toHaveURL(/\/contents$/);
    await contents.gotoDocument(space.id, doc.id);
    await expect(contents.field('Title')).toHaveValue('Saved by keyboard');
  });
});
