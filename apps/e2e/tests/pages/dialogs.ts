import { expect, type Locator, type Page } from '@playwright/test';

/** The open dialog with this title. */
export async function dialog(page: Page, title: string | RegExp): Promise<Locator> {
  const locator = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: title }) });
  await expect(locator).toBeVisible();
  return locator;
}

/** Picks an option of a Spartan select (`hlm-select`) or combobox inside `scope`. */
export async function choose(page: Page, trigger: Locator, option: string | RegExp): Promise<void> {
  await trigger.click();
  await page.getByRole('option', { name: option, exact: typeof option === 'string' }).click();
}

/**
 * Opens a row's menu and picks an item. Lists update live (other tests, other users), and a re-rendered row
 * closes its open menu, so opening is retried until the item can be clicked.
 */
export async function rowMenu(page: Page, row: Locator, item: string): Promise<void> {
  await expect(async () => {
    await row.getByRole('button', { name: 'Actions', exact: true }).click();
    await page.getByRole('menuitem', { name: item, exact: true }).click({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
}

/** Opens a row's menu and returns it, retried like rowMenu. */
export async function openRowMenu(page: Page, row: Locator): Promise<Locator> {
  const menu = page.getByRole('menu');
  await expect(async () => {
    if (!(await menu.isVisible())) await row.getByRole('button', { name: 'Actions', exact: true }).click();
    await expect(menu).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
  return menu;
}

/** Opens a row's menu and runs checks on it; both are retried together, as a re-render can close the menu between. */
export async function expectRowMenu(page: Page, row: Locator, check: (menu: Locator) => Promise<void>): Promise<void> {
  await expect(async () => {
    await page.keyboard.press('Escape');
    const menu = await openRowMenu(page, row);
    await check(menu);
  }).toPass({ timeout: 15_000 });
}
