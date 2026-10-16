import { ContentsPage } from '../pages/contents.page';
import { CSRF } from '../support/app-api';
import { contentById, pageSchema } from '../support/contents';
import { expect, test, uniqueId } from '../support/fixtures';
import { createEnum } from '../support/schemas';

// The schema's rules in the editor. Pre-check → action (fill, Save) → post-check (messages, the Errors list, what
// was stored).
test.describe('Contents → form validation', () => {
  test('required fields of several kinds block Save and are listed under Errors @smoke', async ({ page, api, space }) => {
    const sizes = uniqueId('Sizes');
    await createEnum(api, space.id, sizes, [{ name: 'Small', value: 's' }]);
    const schema = await pageSchema(api, space, [
      { name: 'title', kind: 'TEXT', displayName: 'Title', required: true },
      { name: 'count', kind: 'NUMBER', displayName: 'Count', required: true },
      { name: 'size', kind: 'OPTION', displayName: 'Size', source: sizes, required: true },
    ]);
    const doc = await api.createDocument(space.id, { name: 'Product', slug: 'product', schema: schema.name });
    const contents = new ContentsPage(page);
    const stored = (await contentById(api, space.id, doc.id)).data;

    // Pre-check: an empty required field says so once left.
    await contents.gotoDocument(space.id, doc.id);
    await contents.field('Title').focus();
    await contents.field('Title').blur();
    await expect(page.getByText('Field is required.').first()).toBeVisible();

    // Action: Save. Post-check: refused, listed per field and locale, nothing stored.
    await contents.saveExpectInvalid();
    const errors = await contents.errors();
    await expect(errors).toHaveCount(3);
    await expect(errors.first()).toContainText('the Title Field is required. for Locale English (Default)');
    await page.keyboard.press('Escape');
    expect((await contentById(api, space.id, doc.id)).data).toEqual(stored);

    // Action: fill them. Post-check: saved.
    await contents.field('Title').fill('Shirt');
    await contents.field('Count').fill('3');
    await contents.chooseOption('Size', 'Small');
    await contents.save();
    expect((await contentById(api, space.id, doc.id)).data).toMatchObject({ title: 'Shirt', count: 3, size: 's' });
  });

  test('length, value and choice-count limits, a minimum of 0 included', async ({ page, api, space }) => {
    const tags = uniqueId('Tags');
    await createEnum(api, space.id, tags, [
      { name: 'One', value: 'one' },
      { name: 'Two', value: 'two' },
      { name: 'Three', value: 'three' },
    ]);
    const schema = await pageSchema(api, space, [
      { name: 'code', kind: 'TEXT', displayName: 'Code', minLength: 3, maxLength: 8 },
      { name: 'price', kind: 'NUMBER', displayName: 'Price', minValue: 0, maxValue: 100 },
      { name: 'tags', kind: 'OPTIONS', displayName: 'Tags', source: tags, minValues: 2, maxValues: 2 },
    ]);
    const doc = await api.createDocument(space.id, { name: 'Item', slug: 'item', schema: schema.name });
    const contents = new ContentsPage(page);
    const stored = (await contentById(api, space.id, doc.id)).data;
    await contents.gotoDocument(space.id, doc.id);

    // Text: too short; typing is capped at the maximum.
    await contents.field('Code').fill('ab');
    await contents.field('Code').blur();
    await expect(page.getByText('Minimum length is 3.')).toBeVisible();
    await expect(contents.field('Code')).toHaveAttribute('maxlength', '8');
    await contents.field('Code').fill('abcd');
    await expect(page.getByText('Minimum length is 3.')).toHaveCount(0);

    // Number: below 0 and above 100.
    await contents.field('Price').fill('-5');
    await contents.field('Price').blur();
    await expect(page.getByText('Minimum value is 0.')).toBeVisible();
    await contents.field('Price').fill('150');
    await contents.field('Price').blur();
    await expect(page.getByText('Maximum value is 100.')).toBeVisible();
    await contents.field('Price').fill('20');

    // Options: one choice where two are needed. Refused: nothing stored.
    await contents.chooseOptions('Tags', ['One']);
    await contents.saveExpectInvalid();
    expect((await contentById(api, space.id, doc.id)).data).toEqual(stored);
    await contents.chooseOptions('Tags', ['Two']);
    await contents.save();
    const data = (await contentById(api, space.id, doc.id)).data!;
    expect(data).toMatchObject({ code: 'abcd', price: 20 });
    expect([...(data.tags as string[])].sort()).toEqual(['one', 'two']);
  });

  test('an error in another locale is found on Save', async ({ page, api, space }) => {
    await api.addLocale(space.id, 'de');
    const schema = await pageSchema(api, space, [{ name: 'title', kind: 'TEXT', displayName: 'Title', translatable: true, minLength: 3 }]);
    const doc = await api.createDocument(space.id, { name: 'Home', slug: 'home', schema: schema.name });
    const contents = new ContentsPage(page);
    const stored = (await contentById(api, space.id, doc.id)).data;
    await contents.gotoDocument(space.id, doc.id);
    await contents.field('Title').fill('Welcome');

    // Action: a German value that is too short.
    await contents.editorLocale('German');
    await contents.field('Title').fill('Hi');
    await contents.saveExpectInvalid();

    // Post-check: refused, listed for German; nothing stored, the English value neither.
    const errors = await contents.errors();
    await expect(errors.filter({ hasText: 'for Locale German' })).toHaveCount(1);
    await page.keyboard.press('Escape');
    expect((await contentById(api, space.id, doc.id)).data).toEqual(stored);
  });

  test('open finding: the API stores content that breaks the schema rules (checked in the browser only)', async ({
    api,
    space,
    request,
  }) => {
    const schema = await pageSchema(api, space, [{ name: 'title', kind: 'TEXT', displayName: 'Title', required: true, maxLength: 3 }]);
    const doc = await api.createDocument(space.id, { name: 'Raw', slug: 'raw', schema: schema.name });

    const response = await request.put(`/api/app/spaces/${space.id}/contents/${doc.id}/data`, {
      headers: CSRF,
      data: { data: { _id: doc.id, _schema: schema.name, title: 'far too long' }, assets: [], links: [], references: [] },
    });

    // Today (TEST-PLAN.md, open findings): accepted. Flip to 400 when the server checks content against the schema.
    expect(response.ok()).toBe(true);
    expect((await contentById(api, space.id, doc.id)).data).toMatchObject({ title: 'far too long' });
  });
});
