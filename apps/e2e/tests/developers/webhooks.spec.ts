import { createHmac } from 'node:crypto';

import { WebhooksPage } from '../pages/webhooks.page';
import type { AppApi } from '../support/app-api';
import { expect, test } from '../support/fixtures';
import { WebhookReceiver } from '../support/webhook-receiver';

interface WebhookDto {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
}

function webhooks(api: AppApi, spaceId: string): Promise<WebhookDto[]> {
  return api.get<WebhookDto[]>(`/api/app/spaces/${spaceId}/webhooks`);
}

/** Publishes the translations, which fires `translation.published`. */
async function publish(api: AppApi, spaceId: string): Promise<void> {
  await api.createTranslation(spaceId, { key: `k${Date.now()}${Math.random().toString(36).slice(2, 6)}`, locales: { en: 'v' } });
  await api.publishTranslations(spaceId);
}

/** Waits long enough for a delivery that should not come (deliveries are sent right after the event). */
async function expectNoDelivery(receiver: WebhookReceiver, count: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 2_000));
  expect(receiver.requests).toHaveLength(count);
}

test.describe('Developers → Webhooks', () => {
  let receiver: WebhookReceiver;
  test.beforeEach(async () => {
    receiver = await WebhookReceiver.start();
  });
  test.afterEach(async () => {
    await receiver.close();
  });

  test('creates a webhook in the UI; it receives its event', async ({ page, api, space }) => {
    const list = new WebhooksPage(page);
    await list.goto(space.id);
    await expect(list.empty).toBeVisible();
    expect(await webhooks(api, space.id)).toEqual([]);

    await list.create({ name: 'Deploy hook', url: receiver.url, events: ['translation.published'] });

    await expect(list.row('Deploy hook')).toContainText('Enabled');
    await expect(list.row('Deploy hook')).toContainText(receiver.url);
    expect(await webhooks(api, space.id)).toMatchObject([
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
      const [stored] = await webhooks(api, space.id);
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
    expect((await webhooks(api, space.id))[0].enabled).toBe(false);
    await publish(api, space.id);
    await expectNoDelivery(receiver, 1);

    await list.toggle('Toggle me', 'Enable');

    await expect(list.row('Toggle me')).toContainText('Enabled');
    expect((await webhooks(api, space.id))[0].enabled).toBe(true);
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
    expect(await webhooks(api, space.id)).toEqual([]);
    await publish(api, space.id);
    await expectNoDelivery(receiver, 0);
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
    const field = (term: string) =>
      page
        .locator('dl > div')
        .filter({ has: page.locator('dt', { hasText: term }) })
        .locator('dd');
    await expect(field('Status Code')).toHaveText(/^\s*500\b/);
    await expect(field('Error Type')).toHaveText(/^\s*http\s*$/i);
    await expect(field('Target URL')).toHaveText(receiver.url);
  });
});
