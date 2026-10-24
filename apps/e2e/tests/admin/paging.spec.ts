import type { Page } from '@playwright/test';

import { AdminSpacesPage } from '../pages/admin-spaces.page';
import { AdminUsersPage } from '../pages/admin-users.page';
import { Shell } from '../pages/shell.page';
import { expect, test, uniqueId } from '../support/fixtures';

// Admin → Users and Admin → Spaces list one page at a time: the server pages, sorts and searches (GET /api/app/users,
// GET /api/app/spaces answer `Page<T>`). Each test makes more than one page of its own rows and narrows the table to
// them with the search box, so rows made by tests running alongside do not change what it sees.

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

function paginator(page: Page) {
  return {
    status: page.getByRole('status').filter({ hasText: /^Page \d+ of \d+$/ }),
    next: page.getByRole('button', { name: 'Next page' }),
  };
}

test.describe('Admin → Users, one page at a time', () => {
  test('pages, sorts and searches on the server; an added user is found by the search', async ({ page, api, cleanup }) => {
    const users = new AdminUsersPage(page);
    const prefix = uniqueId('pager');
    const email = (n: number | string) => `${prefix}-${typeof n === 'number' ? pad(n) : n}@e2e.localess.test`;
    for (let i = 0; i < 25; i++) {
      cleanup.user(email(i));
      await api.createUser({ email: email(i), password: 'pager-password', role: 'VIEWER' });
    }
    // The emails of the rows shown, in order.
    const emails = async () =>
      (await page.getByRole('row').filter({ hasText: prefix }).allInnerTexts()).map(it => it.match(/\S+@e2e\.localess\.test/)?.[0]);
    const pages = paginator(page);

    // Action: narrow to this test's users.
    await users.goto();
    await page.getByPlaceholder(/^Search/).fill(prefix);
    await page.getByPlaceholder(/^Search/).press('Enter');

    // Post-check: 25 by email, 20 on the first page, the rest on the second.
    await expect(page.getByText('25 total items')).toBeVisible();
    await expect(pages.status).toHaveText('Page 1 of 2');
    await expect.poll(emails).toEqual(Array.from({ length: 20 }, (_, i) => email(i)));
    await pages.next.click();
    await expect(pages.status).toHaveText('Page 2 of 2');
    await expect.poll(emails).toEqual([20, 21, 22, 23, 24].map(email));

    // Action → post-check: sort by Email descending (asc on the first click, desc on the second), from page 1.
    const header = page.getByRole('columnheader', { name: 'Email', exact: true });
    await header.click();
    await header.click();
    await expect(header).toHaveAttribute('aria-sort', 'descending');
    await expect(pages.status).toHaveText('Page 1 of 2');
    await expect.poll(async () => (await emails())[0]).toBe(email(24));

    // Action → post-check: an added user shows in the search at once (live), the total one more.
    cleanup.user(email('zz'));
    await users.add({ email: email('zz'), password: 'pager-password', role: 'None' });
    await expect(page.getByText('26 total items')).toBeVisible();
    await expect.poll(async () => (await emails())[0]).toBe(email('zz'));
  });
});

test.describe('Admin → Spaces, one page at a time', () => {
  test('pages and searches on the server', async ({ page, api, cleanup }) => {
    const spaces = new AdminSpacesPage(page);
    const prefix = uniqueId('Pager ');
    const name = (n: number) => `${prefix} ${pad(n)}`;
    for (let i = 0; i < 25; i++) {
      cleanup.space(name(i));
      await api.createSpace(name(i));
    }
    const pages = paginator(page);

    // Action
    await spaces.goto();
    await page.getByPlaceholder(/^Search/).fill(prefix.toUpperCase());
    await page.getByPlaceholder(/^Search/).press('Enter');

    // Post-check: by name, case-insensitive search; 20 then 5.
    await expect(page.getByText('25 total items')).toBeVisible();
    await expect(pages.status).toHaveText('Page 1 of 2');
    await expect(spaces.row(name(0))).toBeVisible();
    await expect(spaces.row(name(20))).toHaveCount(0);
    await pages.next.click();
    await expect(spaces.row(name(20))).toBeVisible();
    await expect(spaces.row(name(24))).toBeVisible();
  });
});

test.describe('Space switcher with more than 100 spaces', () => {
  test('a link to the 101st space opens it, and the switcher’s search finds it', async ({ page, api, cleanup }) => {
    test.slow();
    const prefix = uniqueId('Many ');
    const name = (n: number) => `${prefix} ${pad(n, 3)}`;
    let last = { id: '', name: '' };
    for (let i = 0; i <= 100; i++) {
      cleanup.space(name(i));
      last = await api.createSpace(name(i));
    }
    const shell = new Shell(page);
    const switcher = shell.sidebar.getByRole('button').first();

    // Action → post-check: the store loads every page (100 at a time), so the space the link names opens.
    await page.goto(`/features/spaces/${last.id}/dashboard`);
    await expect(switcher).toContainText(last.name);

    // Action → post-check: past 10 spaces the switcher has a search box; it finds a space by part of its name.
    const menu = page.getByRole('menu');
    // A live re-render of the sidebar can swallow the first click (as Shell.switchSpace retries).
    await expect(async () => {
      if (!(await menu.isVisible())) await switcher.click();
      await expect(menu).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await menu.getByRole('searchbox', { name: 'Search spaces' }).fill(`${prefix} 05`.toLowerCase());
    await expect(menu.getByRole('menuitemradio')).toHaveText(
      [name(50), name(51), name(52), name(53), name(54), name(55), name(56), name(57), name(58), name(59)].map(it => new RegExp(it)),
    );
    await menu.getByRole('searchbox', { name: 'Search spaces' }).fill('no space has this name');
    await expect(menu.getByText('No spaces found')).toBeVisible();
    await menu.getByRole('searchbox', { name: 'Search spaces' }).fill(name(0));
    await menu.getByRole('menuitemradio', { name: name(0) }).click();
    await expect(menu).toHaveCount(0);
    await expect(switcher).toContainText(name(0));
  });
});
