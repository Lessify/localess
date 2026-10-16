import { ContentsPage } from '../pages/contents.page';
import { Cdn, contentById, pageSchema } from '../support/contents';
import { expect, test } from '../support/fixtures';

// One document per test, values entered in the editor. Post-check: the value as stored (and its type) and as the
// CDN API delivers it after Publish.
test.describe('Contents → form: simple field kinds', () => {
  test('Text, Text Area, Number, Color, Date, Date and Time, Boolean @smoke', async ({ page, api, space, request }) => {
    const schema = await pageSchema(api, space, [
      { name: 'title', kind: 'TEXT', displayName: 'Title' },
      { name: 'summary', kind: 'TEXTAREA', displayName: 'Summary' },
      { name: 'price', kind: 'NUMBER', displayName: 'Price' },
      { name: 'brand', kind: 'COLOR', displayName: 'Brand Color' },
      { name: 'day', kind: 'DATE', displayName: 'Day' },
      { name: 'starts', kind: 'DATETIME', displayName: 'Starts' },
      { name: 'active', kind: 'BOOLEAN', displayName: 'Active' },
    ]);
    const doc = await api.createDocument(space.id, { name: 'Event', slug: 'event', schema: schema.name });
    const contents = new ContentsPage(page);

    // Pre-check: each kind has its input type.
    await contents.gotoDocument(space.id, doc.id);
    for (const [label, type] of [
      ['Title', 'text'],
      ['Price', 'number'],
      ['Brand Color', 'color'],
      ['Day', 'date'],
      ['Starts', 'datetime-local'],
    ]) {
      await expect(contents.field(label), label).toHaveAttribute('type', type);
    }
    await expect(page.getByRole('switch', { name: 'Active' })).toHaveAttribute('aria-checked', 'false');

    // Action
    await contents.field('Title').fill('Summer Party');
    await contents.field('Summary').fill('Line one\nLine two');
    await contents.field('Price').fill('42.5');
    await contents.field('Brand Color').fill('#ff8800');
    await contents.field('Day').fill('2026-07-01');
    await contents.field('Starts').fill('2026-07-01T18:30');
    await page.getByRole('switch', { name: 'Active' }).click();
    await contents.save();
    await contents.publish();

    // Post-check: stored with their types.
    const expected = {
      title: 'Summer Party',
      summary: 'Line one\nLine two',
      price: 42.5,
      brand: '#ff8800',
      day: '2026-07-01',
      starts: '2026-07-01T18:30',
      active: true,
    };
    expect((await contentById(api, space.id, doc.id)).data).toMatchObject(expected);
    expect((await new Cdn(request, api, space.id).get({ id: doc.id })).body?.data).toMatchObject(expected);
    await page.reload();
    await expect(contents.field('Price')).toHaveValue('42.5');
    await expect(page.getByRole('switch', { name: 'Active' })).toHaveAttribute('aria-checked', 'true');
  });

  test('Rich Text with bold text and a list; Markdown as source', async ({ page, api, space, request }) => {
    const schema = await pageSchema(api, space, [
      { name: 'body', kind: 'RICH_TEXT', displayName: 'Body' },
      { name: 'notes', kind: 'MARKDOWN', displayName: 'Notes' },
    ]);
    const doc = await api.createDocument(space.id, { name: 'Article', slug: 'article', schema: schema.name });
    const contents = new ContentsPage(page);

    // Pre-check
    await contents.gotoDocument(space.id, doc.id);
    const editor = page.locator('#schema-field-body .ProseMirror');
    await expect(editor).toBeVisible();

    // Action: plain, bold (Ctrl+B), then a bullet list (Ctrl+Shift+8); Markdown typed as source.
    await editor.click();
    await page.keyboard.type('Plain and ');
    await page.keyboard.press('Control+b');
    await page.keyboard.type('bold');
    await page.keyboard.press('Control+b');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Control+Shift+8');
    await page.keyboard.type('First item');
    await contents.field('Notes').fill('# Heading\n\n- one\n- two');
    await contents.save();
    await contents.publish();

    // Post-check: TipTap JSON with a bold mark and a bullet list; the Markdown string as typed.
    const data = (await contentById(api, space.id, doc.id)).data!;
    const body = JSON.stringify(data.body);
    expect(body).toContain('"type":"doc"');
    expect(body).toContain('"type":"bold"');
    expect(body).toContain('"type":"bulletList"');
    expect(body).toContain('First item');
    expect(data.notes).toBe('# Heading\n\n- one\n- two');
    const cdn = (await new Cdn(request, api, space.id).get({ id: doc.id })).body?.data;
    expect(JSON.stringify(cdn?.body)).toContain('"type":"bold"');
    expect(cdn?.notes).toBe('# Heading\n\n- one\n- two');
    await page.reload();
    await expect(page.locator('#schema-field-body .ProseMirror strong')).toHaveText('bold');
    await expect(page.locator('#schema-field-body .ProseMirror li')).toHaveText('First item');
  });

  test("open finding: a field's Default Value is stored on the schema but a new document does not get it", async ({ page, api, space }) => {
    const schema = await pageSchema(api, space, [{ name: 'title', kind: 'TEXT', displayName: 'Title', defaultValue: 'Untitled' } as never]);
    const doc = await api.createDocument(space.id, { name: 'New', slug: 'new', schema: schema.name });
    const contents = new ContentsPage(page);

    await contents.gotoDocument(space.id, doc.id);

    // Today (TEST-PLAN.md, open findings): nothing in the content editor reads `defaultValue`. Flip when it does.
    await expect(contents.field('Title')).toHaveValue('');
  });
});
