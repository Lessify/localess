import { expect, test } from './support/fixtures';

// The environment the Playwright Test Agents (.claude/agents/playwright-test-*.md) start from: the signed-in admin in
// a fresh space of its own (the `space` fixture), with the suite's error guard and offline browser. Also an ordinary
// check that a space opens.
test.describe('Seed', () => {
  test('a fresh space opens on its dashboard', async ({ page, space }) => {
    await page.goto(`/features/spaces/${space.id}/dashboard`);
    await expect(page.getByRole('button', { name: space.name })).toBeVisible();
  });
});
