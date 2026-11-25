import { isDeepStrictEqual } from 'node:util';

import { ContentsPage } from '../pages/contents.page';
import { dragAbove } from '../pages/drag';
import { Cdn, contentById, pageSchema } from '../support/contents';
import { expect, test, uniqueId } from '../support/fixtures';

type Block = { _id: string; _schema: string; [field: string]: unknown };

// Schema (one block) and Schemas (a list of blocks) fields. Pre-check → action (editor) → post-check (stored blocks,
// their order, the CDN API).
test.describe('Contents → form: nested blocks', () => {
  test('a Schema field holds one block, edited in its own view and left by the breadcrumb', async ({ page, api, space, request }) => {
    const card = uniqueId('Card');
    await api.createSchema(space.id, {
      name: card,
      type: 'NODE',
      displayName: 'Card',
      fields: [{ name: 'heading', kind: 'TEXT', displayName: 'Heading' }],
    });
    const schema = await pageSchema(api, space, [
      { name: 'title', kind: 'TEXT', displayName: 'Title' },
      { name: 'hero', kind: 'SCHEMA', displayName: 'Hero', schemas: [card] },
    ]);
    const doc = await api.createDocument(space.id, { name: 'Home', slug: 'home', schema: schema.name });
    const contents = new ContentsPage(page);

    // Pre-check: no block.
    await contents.gotoDocument(space.id, doc.id);
    const hero = contents.blockField('Hero');
    const blocks = contents.blocks(hero);
    await expect(blocks).toHaveCount(0);

    // Action: add the block; only one is allowed.
    await hero.getByRole('button', { name: 'Add Schema', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Card' }).click();
    await expect(blocks).toHaveCount(1);
    await expect(hero.getByRole('button', { name: 'Add Schema', exact: true })).toBeDisabled();

    // Open it, fill it, back to the document.
    await blocks.first().click();
    await expect(contents.openBlock).toHaveText('Card');
    await contents.field('Heading').fill('Hero heading');
    await contents.backToDocumentRoot();
    await expect(contents.field('Title')).toBeVisible();
    await contents.field('Title').fill('Home');
    await contents.save();
    await contents.publish();

    // Post-check: stored, delivered by the CDN, and back after a reload.
    const data = (await contentById(api, space.id, doc.id)).data!;
    expect(data.title).toBe('Home');
    expect(data.hero).toMatchObject({ _schema: card, heading: 'Hero heading' });
    expect((data.hero as Block)._id).toBeTruthy();
    const cdn = (await new Cdn(request, api, space.id).get({ id: doc.id })).body?.data;
    expect(cdn).toMatchObject({ title: 'Home', hero: { _id: (data.hero as Block)._id, _schema: card, heading: 'Hero heading' } });
    await page.reload();
    await expect(contents.field('Title')).toHaveValue('Home');
    await expect(blocks).toHaveCount(1);
    await expect(hero.getByRole('button', { name: 'Add Schema', exact: true })).toBeDisabled();
    await blocks.first().click();
    await expect(contents.field('Heading')).toHaveValue('Hero heading');
  });

  test('a Schemas field: add at the end and above, clone, move, delete; the order is kept @smoke', async ({
    page,
    api,
    space,
    request,
  }) => {
    const card = uniqueId('Card');
    const quote = uniqueId('Quote');
    await api.createSchema(space.id, {
      name: card,
      type: 'NODE',
      displayName: 'Card',
      fields: [{ name: 'heading', kind: 'TEXT', displayName: 'Heading' }],
    });
    await api.createSchema(space.id, {
      name: quote,
      type: 'NODE',
      displayName: 'Quote',
      fields: [{ name: 'text', kind: 'TEXT', displayName: 'Text' }],
    });
    const schema = await pageSchema(api, space, [{ name: 'body', kind: 'SCHEMAS', displayName: 'Body', schemas: [card, quote] }]);
    const doc = await api.createDocument(space.id, { name: 'Landing', slug: 'landing', schema: schema.name });
    const contents = new ContentsPage(page);
    const body = contents.blockField('Body');
    const blocks = contents.blocks(body);
    const order = () => contents.blockSchemas(body);

    // Pre-check
    await contents.gotoDocument(space.id, doc.id);
    await expect(blocks).toHaveCount(0);

    // Action: Card, Quote at the end; a Card above the Quote.
    for (const name of ['Card', 'Quote']) {
      await body.getByRole('button', { name: 'Add Schema at the end' }).click();
      await page.getByRole('menuitem', { name }).click();
    }
    await blocks.nth(1).getByRole('button', { name: 'Add Schema above' }).click();
    await page.getByRole('menuitem', { name: 'Card' }).click();
    await expect.poll(order).toEqual([card, card, quote]);

    // Fill the first card and the quote.
    await blocks.first().click();
    await contents.field('Heading').fill('First card');
    await contents.backToDocumentRoot();
    await blocks.nth(2).click();
    await contents.field('Text').fill('A quote');
    await contents.backToDocumentRoot();

    // Clone the first card: a copy right after it, with its value.
    await blocks.first().getByRole('button', { name: 'Clone the schema' }).click();
    await expect.poll(order).toEqual([card, card, card, quote]);
    // Delete the empty card (now third).
    await blocks.nth(2).getByRole('button', { name: 'Delete' }).click();
    await expect.poll(order).toEqual([card, card, quote]);
    // Move the quote to the top.
    await dragAbove(page, blocks.nth(2).getByRole('button', { name: 'Move' }), blocks.first(), async () =>
      isDeepStrictEqual(await order(), [quote, card, card]),
    );
    await contents.save();
    await contents.publish();

    // Post-check: stored in order, the clone with its own id and the same value; the CDN keeps the order.
    const stored = (await contentById(api, space.id, doc.id)).data!.body as Block[];
    expect(stored.map(it => it._schema)).toEqual([quote, card, card]);
    expect(stored[0]).toMatchObject({ text: 'A quote' });
    expect(stored[1]).toMatchObject({ heading: 'First card' });
    expect(stored[2]).toMatchObject({ heading: 'First card' });
    expect(new Set(stored.map(it => it._id)).size).toBe(3);
    const cdn = (await new Cdn(request, api, space.id).get({ id: doc.id })).body?.data.body as Block[];
    expect(cdn.map(it => it._schema)).toEqual([quote, card, card]);
    await page.reload();
    await expect.poll(order).toEqual([quote, card, card]);
  });
});
