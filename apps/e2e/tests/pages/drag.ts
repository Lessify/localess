import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Drags `handle` to just above `target` (CDK drag and drop sorts by the pointer), then waits for `moved()`. Retried
 * only when the drag did nothing: one that starts while a list is still re-rendering is lost, and a second drag after
 * a successful one would move the item back.
 */
export async function dragAbove(page: Page, handle: Locator, target: Locator, moved: () => Promise<boolean>): Promise<void> {
  await expect(async () => {
    const from = await handle.boundingBox();
    const to = await target.boundingBox();
    if (!from || !to) throw new Error('nothing to drag');
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 - 10, { steps: 5 });
    await page.mouse.move(to.x + to.width / 2, to.y + 2, { steps: 15 });
    await page.mouse.up();
    await expect.poll(moved, { timeout: 3_000 }).toBe(true);
  }).toPass({ timeout: 20_000 });
}
