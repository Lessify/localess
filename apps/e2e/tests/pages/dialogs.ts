import { expect, type Locator, type Page } from '@playwright/test';

/** The open dialog with this title. */
export async function dialog(page: Page, title: string | RegExp): Promise<Locator> {
  const locator = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: title }) });
  await expect(locator).toBeVisible();
  return locator;
}

/**
 * A form field refused with `message` (checked on blur): the message is shown and Save is disabled. The field must
 * already hold the value.
 */
export async function expectRefused(form: Locator, field: Locator, message: string): Promise<void> {
  await field.blur();
  await expect(form.getByText(message, { exact: true })).toBeVisible();
  await expect(form.getByRole('button', { name: 'Save' })).toBeDisabled();
}

/** Cancels a form dialog and waits for it to close. */
export async function cancel(form: Locator): Promise<void> {
  await form.getByRole('button', { name: 'Cancel' }).click();
  await expect(form).toBeHidden();
}

/**
 * Answers the native `confirm()` the next click raises (the unsaved-changes guard), and returns its message.
 * Register before the click: `const asked = answerConfirm(page, false); await click; expect(await asked)...`.
 */
export function answerConfirm(page: Page, accept: boolean): Promise<string> {
  return new Promise(resolve =>
    page.once('dialog', dialog => {
      resolve(dialog.message());
      void (accept ? dialog.accept() : dialog.dismiss());
    }),
  );
}

/** Picks an option of a Spartan select (`hlm-select`) or combobox inside `scope`. */
export async function choose(page: Page, trigger: Locator, option: string | RegExp): Promise<void> {
  await trigger.click();
  await page.getByRole('option', { name: option, exact: typeof option === 'string' }).click();
  // A list still closing doubles its options for the next select.
  await expect(page.getByRole('listbox')).toHaveCount(0);
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

/**
 * Closes the open menu, if any: Escape sent to the menu itself (a menu opened with the mouse leaves the focus on its
 * trigger, where Escape does nothing), then waits until it is gone.
 */
export async function closeMenu(page: Page): Promise<void> {
  const menu = page.getByRole('menu');
  await expect(async () => {
    if (await menu.isVisible()) await menu.press('Escape');
    await expect(menu).toBeHidden({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
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
    // Another row's menu, left open, would answer for this row's.
    await closeMenu(page);
    const menu = await openRowMenu(page, row);
    await check(menu);
  }).toPass({ timeout: 15_000 });
}
