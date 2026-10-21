import { Webhook } from 'standardwebhooks';

import { confirmDialog } from '../pages/notifications';
import { WebhooksPage } from '../pages/webhooks.page';
import type { AppApi } from '../support/app-api';
import { expect, test, uniqueId } from '../support/fixtures';
import { type ReceivedRequest, WebhookReceiver } from '../support/webhook-receiver';

/** Checks a delivery as a receiver would (Standard Webhooks: signature and time); throws when it isn't genuine. */
function verify(secret: string, delivery: ReceivedRequest): unknown {
  return new Webhook(secret).verify(delivery.body, delivery.headers as Record<string, string>);
}

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
      signed: true,
    });
    expect(webhook.secret).toMatch(/^whsec_/);
    await publish(api, space.id);

    await expect.poll(() => receiver.requests.length).toBe(1);
    const [delivery] = receiver.requests;
    expect(delivery.headers['x-webhook-event']).toBe('translation.published');
    // What a receiver does: the standardwebhooks library checks the signature and the time.
    expect(verify(webhook.secret!, delivery)).toMatchObject({ event: 'translation.published', spaceId: space.id });

    const detail = new WebhooksPage(page);
    await detail.gotoDetail(space.id, webhook.id);
    await expect(detail.logs).toHaveCount(1);
    await expect(detail.logs.first()).toContainText('translation.published');
    await expect(detail.logs.first()).toContainText('Success');
  });

  test('the webhook page shows its logs a page at a time; the status filter and the id search narrow on the server', async ({
    page,
    api,
    space,
  }) => {
    const webhook = await api.createWebhook(space.id, { name: 'Busy', url: receiver.url, events: ['translation.published'] });
    // 22 delivered, then 3 refused by the receiver: 25 logs, 3 of them failures.
    for (let i = 0; i < 25; i++) {
      if (i === 22) receiver.status = 500;
      await publish(api, space.id);
      await expect.poll(() => receiver.requests.length).toBe(i + 1);
    }
    const detail = new WebhooksPage(page);
    const status = page.getByRole('status').filter({ hasText: /^Page \d+ of \d+$/ });

    await detail.gotoDetail(space.id, webhook.id);
    await expect(page.getByText('25 total items')).toBeVisible();
    await expect(status).toHaveText('Page 1 of 2');
    await expect(detail.logs).toHaveCount(20);
    // Newest first: the 3 failures lead.
    await expect(detail.logs.first()).toContainText('Failure');
    const lastOnFirstPage = (await detail.logs.last().locator('td.font-mono').innerText()).trim();
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(status).toHaveText('Page 2 of 2');
    await expect(detail.logs).toHaveCount(5);

    await detail.filterStatus(/failure/i);
    await expect(page.getByText('3 total items')).toBeVisible();
    await expect(detail.logs).toHaveCount(3);

    // Without the filter, a log of the first page by its id.
    await page.getByRole('button', { name: 'Reset' }).click();
    await detail.search(lastOnFirstPage);
    await expect(detail.logs).toHaveCount(1);
    await expect(detail.logs.first()).toContainText(lastOnFirstPage);
  });

  test('a signed webhook: its secret is shown once, regenerated (the old one stops) and turned off', async ({ page, api, space }) => {
    const list = new WebhooksPage(page);
    await list.goto(space.id);

    // Action: add it signed; the secret is shown once, never answered again.
    await list.create({ name: 'Signed', url: receiver.url, events: ['translation.published'], signed: true });
    const first = await list.takeSecret();
    expect(first).toMatch(/^whsec_/);
    const [stored] = await api.findWebhooks(space.id);
    expect(stored).toMatchObject({ name: 'Signed', hasSecret: true });
    expect(stored).not.toHaveProperty('secret');
    await publish(api, space.id);
    await expect.poll(() => receiver.requests.length).toBe(1);
    expect(verify(first, receiver.requests[0])).toMatchObject({ event: 'translation.published' });

    // Action → post-check: regenerated on its page, after a confirmation; deliveries verify with the new one only.
    await list.gotoDetail(space.id, stored.id);
    await expect(list.signing).toContainText('Signed');
    await list.signing.getByRole('button', { name: 'Regenerate Secret' }).click();
    await confirmDialog(page, 'Regenerate Secret');
    const second = await list.takeSecret();
    expect(second).not.toBe(first);
    await publish(api, space.id);
    await expect.poll(() => receiver.requests.length).toBe(2);
    expect(verify(second, receiver.requests[1])).toBeTruthy();
    expect(() => verify(first, receiver.requests[1])).toThrow();

    // Action → post-check: turned off, deliveries carry no signature.
    await list.signing.getByRole('button', { name: 'Turn Off Signing' }).click();
    await confirmDialog(page, 'Turn Off Signing');
    await expect(list.signing).toContainText('Not signed');
    expect((await api.findWebhooks(space.id))[0].hasSecret).toBe(false);
    await publish(api, space.id);
    await expect.poll(() => receiver.requests.length).toBe(3);
    expect(receiver.requests[2].headers).not.toHaveProperty('webhook-signature');
  });

  test('a header is sent with every delivery, its value never shown; kept on edit, then removed', async ({ page, api, space }) => {
    const list = new WebhooksPage(page);
    await list.goto(space.id);

    // Action: added with an Authorization header; the API answers its name only.
    await list.create({
      name: 'Api',
      url: receiver.url,
      events: ['translation.published'],
      headers: { Authorization: 'Bearer e2e-token' },
    });
    const [stored] = await api.findWebhooks(space.id);
    expect(stored).toMatchObject({ headerNames: ['Authorization'] });
    expect(JSON.stringify(stored)).not.toContain('e2e-token');
    await publish(api, space.id);
    await expect.poll(() => receiver.requests.length).toBe(1);
    expect(receiver.requests[0].headers['authorization']).toBe('Bearer e2e-token');

    // Pre-check → action: the Edit form holds the name, never the value; renamed, the header is kept.
    const form = await list.openEdit('Api', { name: 'Api renamed' });
    await expect(form.getByLabel('Header 1 name')).toHaveValue('Authorization');
    await expect(form.getByLabel('Header 1 value')).toHaveValue('');
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
    await publish(api, space.id);
    await expect.poll(() => receiver.requests.length).toBe(2);
    expect(receiver.requests[1].headers['authorization']).toBe('Bearer e2e-token');

    // Action → post-check: removed, no longer sent.
    await list.edit('Api renamed', { removeHeaders: ['Authorization'] });
    expect((await api.findWebhooks(space.id))[0]).not.toHaveProperty('headerNames');
    await publish(api, space.id);
    await expect.poll(() => receiver.requests.length).toBe(3);
    expect(receiver.requests[2].headers).not.toHaveProperty('authorization');
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
