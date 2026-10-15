import { createHmac } from 'node:crypto';

import { dialog } from '../pages/dialogs';
import { expectToast } from '../pages/notifications';
import { expect, test } from '../support/fixtures';
import { WebhookReceiver } from '../support/webhook-receiver';

test.describe('Developers → Webhooks', () => {
  test('creates a webhook in the UI', async ({ page, space }) => {
    await page.goto(`/features/spaces/${space.id}/developers/webhooks`);
    await expect(page.getByText('No webhooks yet.')).toBeVisible();

    await page.getByRole('button', { name: 'Add Webhook' }).click();
    const form = await dialog(page, 'Add Webhook');
    await form.getByLabel('Name', { exact: true }).fill('Deploy hook');
    await form.getByLabel('URL', { exact: true }).fill('https://hooks.example.com/deploy');
    await form.getByPlaceholder('Select events...').click();
    await page.getByRole('option', { name: 'translation.published' }).click();
    await page.keyboard.press('Escape');
    await form.getByRole('button', { name: 'Save' }).click();
    await expectToast(page, 'Webhook has been created.');

    const row = page.getByRole('row').filter({ hasText: 'Deploy hook' });
    await expect(row).toContainText('Enabled');
    await expect(row).toContainText('https://hooks.example.com/deploy');
  });

  test('delivers a signed event on publish and logs it @smoke', async ({ page, api, space }) => {
    const receiver = await WebhookReceiver.start();
    try {
      const webhook = await api.createWebhook(space.id, {
        name: 'Receiver',
        url: receiver.url,
        events: ['translation.published'],
        secret: 'e2e-secret',
      });
      await api.createTranslation(space.id, { key: 'k1', locales: { en: 'v' } });
      await api.publishTranslations(space.id);

      await expect.poll(() => receiver.requests.length).toBe(1);
      const [delivery] = receiver.requests;
      expect(delivery.headers['x-webhook-event']).toBe('translation.published');
      expect(JSON.parse(delivery.body)).toMatchObject({ event: 'translation.published', spaceId: space.id });
      const expected = `sha256=${createHmac('sha256', 'e2e-secret').update(delivery.body).digest('hex')}`;
      expect(delivery.headers['x-webhook-signature']).toBe(expected);

      await page.goto(`/features/spaces/${space.id}/developers/webhooks/${webhook.id}`);
      await expect(page.getByRole('row').filter({ hasText: 'translation.published' })).toBeVisible();
    } finally {
      await receiver.close();
    }
  });
});
