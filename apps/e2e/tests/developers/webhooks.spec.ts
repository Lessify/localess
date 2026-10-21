import { createHmac } from 'node:crypto';

import { WebhooksPage } from '../pages/webhooks.page';
import type { AppApi } from '../support/app-api';
import { expect, test, uniqueId } from '../support/fixtures';
import { WebhookReceiver } from '../support/webhook-receiver';

/** Publishes the translations, which fires `translation.published`. */
async function publish(api: AppApi, spaceId: string): Promise<void> {
  await api.createTranslation(spaceId, { key: uniqueId('k'), locales: { en: 'v' } });
  await api.publishTranslations(spaceId);
}

/**
 * Publishes, and checks that `receiver` gets no delivery for it. A witness webhook for the same event is the barrier: the
 * server looks up every webhook of an event in one query and sends to all of them at once, so once the witness has its
 * delivery, `receiver` would have had its own.
 */
async function publishExpectingNoDelivery(api: AppApi, spaceId: string, receiver: WebhookReceiver): Promise<void> {
  const before = receiver.requests.length;
  const witness = await WebhookReceiver.start();
  try {
    const hook = await api.createWebhook(spaceId, { name: 'Witness', url: witness.url, events: ['translation.published'] });
    await publish(api, spaceId);
    await expect.poll(() => witness.requests.length).toBe(1);
    expect(receiver.requests).toHaveLength(before);
    await api.delete(`/api/app/spaces/${spaceId}/webhooks/${hook.id}`);
  } finally {
    await witness.close();
  }
}

test.describe('Developers → Webhooks', () => {
  let receiver: WebhookReceiver;
  test.beforeEach(async () => {
    receiver = await WebhookReceiver.start();
  });
  test.afterEach(async () => {
    await receiver.close();
  });

  test('lists one page at a time; the status filter and the search narrow on the server', async ({ page, api, space }) => {
    const name = (n: number) => `Hook ${String(n).padStart(2, '0')}`;
    for (let i = 0; i < 22; i++) {
      const created = await api.createWebhook(space.id, {
        name: name(i),
        url: `https://hook-${i}.example.com/`,
        events: ['translation.published'],
      });
      if (i % 5 === 0) await api.setWebhookEnabled(space.id, created.id, false);
    }
    const list = new WebhooksPage(page);
    const status = page.getByRole('status').filter({ hasText: /^Page \d+ of \d+$/ });

    await list.goto(space.id);
    await expect(page.getByText('22 total items')).toBeVisible();
    await expect(status).toHaveText('Page 1 of 2');
    await expect.poll(() => list.names()).toEqual(Array.from({ length: 20 }, (_, i) => name(i)));
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect.poll(() => list.names()).toEqual([name(20), name(21)]);

    // Back to the first page, only the disabled ones (0, 5, 10, 15, 20).
    await list.filterStatus('Disabled');
    await expect(page.getByText('5 total items')).toBeVisible();
    await expect.poll(() => list.names()).toEqual([0, 5, 10, 15, 20].map(name));

    // The URL is searched too.
    await list.search('hook-15.example');
    await expect.poll(() => list.names()).toEqual([name(15)]);
  });

  test('creates a webhook in the UI; it receives its event', async ({ page, api, space }) => {
    const list = new WebhooksPage(page);
    await list.goto(space.id);
    await expect(list.empty).toBeVisible();
    expect(await api.findWebhooks(space.id)).toEqual([]);

    await list.create({ name: 'Deploy hook', url: receiver.url, events: ['translation.published'] });

    await expect(list.row('Deploy hook')).toContainText('Enabled');
    await expect(list.row('Deploy hook')).toContainText(receiver.url);
    await page.reload();
    await expect(list.row('Deploy hook')).toContainText(receiver.url);
    expect(await api.findWebhooks(space.id)).toMatchObject([
      { name: 'Deploy hook', url: receiver.url, events: ['translation.published'], enabled: true },
    ]);
    await publish(api, space.id);
    await expect.poll(() => receiver.events).toEqual(['translation.published']);
  });

  test('edits the name, URL and events; deliveries go to the new URL', async ({ page, api, space }) => {
    const old = await WebhookReceiver.start();
    try {
      await api.createWebhook(space.id, { name: 'Old hook', url: old.url, events: ['translation.published'] });
      const list = new WebhooksPage(page);
      await list.goto(space.id);
      await expect(list.row('Old hook')).toContainText(old.url);

      await list.edit('Old hook', { name: 'New hook', url: receiver.url, events: ['translation.changed'] });

      await expect(list.row('New hook')).toContainText(receiver.url);
      await expect(list.row('Old hook')).toHaveCount(0);
      await page.reload();
      await expect(list.row('New hook')).toContainText(receiver.url);
      const [stored] = await api.findWebhooks(space.id);
      expect(stored).toMatchObject({ name: 'New hook', url: receiver.url, enabled: true });
      expect([...stored.events].sort()).toEqual(['translation.changed', 'translation.published']);
      await publish(api, space.id);
      // The new key fires translation.changed, the publish translation.published.
      await expect.poll(() => [...receiver.events].sort()).toEqual(['translation.changed', 'translation.published']);
      expect(old.requests).toHaveLength(0);
    } finally {
      await old.close();
    }
  });

  test('a disabled webhook receives nothing until it is enabled again', async ({ page, api, space }) => {
    await api.createWebhook(space.id, { name: 'Toggle me', url: receiver.url, events: ['translation.published'] });
    await publish(api, space.id);
    await expect.poll(() => receiver.requests.length).toBe(1);
    const list = new WebhooksPage(page);
    await list.goto(space.id);
    await expect(list.row('Toggle me')).toContainText('Enabled');

    await list.toggle('Toggle me', 'Disable');

    await expect(list.row('Toggle me')).toContainText('Disabled');
    await page.reload();
    await expect(list.row('Toggle me')).toContainText('Disabled');
    expect((await api.findWebhooks(space.id))[0].enabled).toBe(false);
    await publishExpectingNoDelivery(api, space.id, receiver);

    await list.toggle('Toggle me', 'Enable');

    await expect(list.row('Toggle me')).toContainText('Enabled');
    expect((await api.findWebhooks(space.id))[0].enabled).toBe(true);
    await publish(api, space.id);
    await expect.poll(() => receiver.requests.length).toBe(2);
  });

  test('deletes a webhook; it receives nothing more', async ({ page, api, space }) => {
    await api.createWebhook(space.id, { name: 'Remove me', url: receiver.url, events: ['translation.published'] });
    const list = new WebhooksPage(page);
    await list.goto(space.id);
    await expect(list.row('Remove me')).toBeVisible();

    await list.delete('Remove me');

    await expect(list.row('Remove me')).toHaveCount(0);
    await expect(list.empty).toBeVisible();
    await page.reload();
    await expect(list.empty).toBeVisible();
    expect(await api.findWebhooks(space.id)).toEqual([]);
    await publishExpectingNoDelivery(api, space.id, receiver);
  });

  test('delivers a signed event on publish and logs it @smoke', async ({ page, api, space }) => {
    const webhook = await api.createWebhook(space.id, {
      name: 'Receiver',
      url: receiver.url,
      events: ['translation.published'],
      secret: 'e2e-secret',
    });
    await publish(api, space.id);

    await expect.poll(() => receiver.requests.length).toBe(1);
    const [delivery] = receiver.requests;
    expect(delivery.headers['x-webhook-event']).toBe('translation.published');
    expect(JSON.parse(delivery.body)).toMatchObject({ event: 'translation.published', spaceId: space.id });
    const expected = `sha256=${createHmac('sha256', 'e2e-secret').update(delivery.body).digest('hex')}`;
    expect(delivery.headers['x-webhook-signature']).toBe(expected);

    const detail = new WebhooksPage(page);
    await detail.gotoDetail(space.id, webhook.id);
    await expect(detail.logs).toHaveCount(1);
    await expect(detail.logs.first()).toContainText('translation.published');
    await expect(detail.logs.first()).toContainText('Success');
  });

  test("the webhook page logs a failed delivery with the receiver's status code", async ({ page, api, space }) => {
    const webhook = await api.createWebhook(space.id, { name: 'Failing', url: receiver.url, events: ['translation.published'] });
    receiver.status = 500;
    const detail = new WebhooksPage(page);
    await detail.gotoDetail(space.id, webhook.id);
    await expect(page.getByRole('heading', { name: 'Failing' })).toBeVisible();
    await expect(detail.logs).toHaveCount(0);

    await publish(api, space.id);
    await expect.poll(() => receiver.requests.length).toBe(1);

    await page.reload();
    await expect(detail.logs).toHaveCount(1);
    await expect(detail.logs.first()).toContainText('Failure');
    await detail.logs.first().click();
    await expect(detail.logField('Status Code')).toHaveText(/^\s*500\b/);
    await expect(detail.logField('Error Type')).toHaveText(/^\s*http\s*$/i);
    await expect(detail.logField('Target URL')).toHaveText(receiver.url);
  });
});
