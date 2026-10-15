import type { APIRequestContext } from '@playwright/test';

import { MePage } from '../pages/me.page';
import { Shell } from '../pages/shell.page';
import { CSRF } from '../support/app-api';
import { anonymousRequest, expect, test, uniqueId } from '../support/fixtures';

// Every test works on its own user (the shared admin must not change) and follows pre-check → action (UI) →
// post-check (the page, again after a reload, the API, and what the account can now do).
test.describe('Me → profile', () => {
  let client: APIRequestContext;
  test.beforeEach(async ({ playwright, baseURL }) => {
    client = await anonymousRequest(playwright, baseURL, CSRF);
  });
  test.afterEach(async () => {
    await client.dispose();
  });

  async function canSignIn(email: string, password: string): Promise<boolean> {
    await client.post('/api/auth/logout');
    return (await client.post('/api/auth/login', { data: { email, password } })).ok();
  }

  test.describe('view', () => {
    test('opens from the user menu and shows a custom user with their permissions', async ({ createUser, signInAs }) => {
      const user = await createUser({ permissions: ['TRANSLATION_READ', 'CONTENT_READ'] });
      const page = await signInAs(user);
      const me = new MePage(page);
      await page.goto('/features/welcome');

      const menu = await new Shell(page).openUserMenu(user.email);
      await menu.getByRole('menuitem', { name: 'Profile' }).click();

      await expect(page).toHaveURL(/\/features\/me$/);
      await expect(me.field('Email')).toHaveText(`Email: ${user.email}`);
      await expect(me.field('Email Verified')).toHaveText('Email Verified: No');
      await expect(me.field('Role')).toHaveText('Role: CUSTOM');
      await expect(me.field('Permissions')).toContainText('TRANSLATION_READ');
      await expect(me.field('Permissions')).toContainText('CONTENT_READ');
      for (const button of ['Update Profile', 'Update Email', 'Update Password'] as const) {
        await expect(me.button(button)).toBeVisible();
      }
    });

    test('shows an admin without a permission list', async ({ createUser, signInAs }) => {
      const user = await createUser({ role: 'ADMIN' });
      const page = await signInAs(user);
      const me = new MePage(page);

      await me.goto(user.email);

      await expect(me.field('Role')).toHaveText('Role: ADMIN');
      await expect(me.field('Permissions')).toHaveCount(0);
    });
  });

  test.describe('update profile', () => {
    test('changes the display name: on the page, in the user menu, for admins and in the API @smoke', async ({
      api,
      createUser,
      signInAs,
    }) => {
      const user = await createUser({ displayName: 'Before', permissions: ['TRANSLATION_READ'] });
      const page = await signInAs(user);
      const me = new MePage(page);
      const newName = `After ${uniqueId('')}`;

      // Pre-check
      await me.goto(user.email);
      await expect(me.heading).toHaveText('Before');
      expect(await api.findUserByEmail(user.email)).toMatchObject({ displayName: 'Before' });

      // Action
      await me.updateProfile({ displayName: newName });

      // Post-check
      await expect(me.heading).toHaveText(newName);
      await expect(page.getByRole('button', { name: new RegExp(`${newName}.*${user.email}`) })).toBeVisible();
      await page.reload();
      await expect(me.heading).toHaveText(newName);
      expect(await api.findUserByEmail(user.email)).toMatchObject({ displayName: newName });
    });

    test('sets an avatar URL; an invalid URL is refused and nothing changes', async ({ api, createUser, signInAs }) => {
      const user = await createUser({ permissions: ['TRANSLATION_READ'] });
      const page = await signInAs(user);
      const me = new MePage(page);
      const avatarUrl = 'https://images.example.com/avatar.png';

      // Pre-check: the default avatar.
      await me.goto(user.email);
      await expect(me.avatar).toHaveAttribute('src', /account_circle\.svg/);

      // Action 1: a valid URL. Post-check.
      await me.updateProfile({ photoURL: avatarUrl });
      await expect(me.avatar).toHaveAttribute('src', avatarUrl);
      const users = await api.get<{ email: string; photoURL?: string }[]>('/api/app/users');
      expect(users.find(it => it.email === user.email)?.photoURL).toBe(avatarUrl);

      // Action 2: not a URL. Post-check: refused, the valid one stays.
      const form = await me.openProfile({ photoURL: 'not a url' });
      await me.save(form, 'User can not be updated.');
      await page.reload();
      await expect(me.avatar).toHaveAttribute('src', avatarUrl);
    });

    test('cancelling keeps the display name', async ({ api, createUser, signInAs }) => {
      const user = await createUser({ displayName: 'Kept', permissions: ['TRANSLATION_READ'] });
      const page = await signInAs(user);
      const me = new MePage(page);

      // Pre-check
      await me.goto(user.email);
      await expect(me.heading).toHaveText('Kept');

      // Action
      const form = await me.openProfile({ displayName: 'Not saved' });
      await form.getByRole('button', { name: 'Cancel' }).click();
      await expect(form).toBeHidden();

      // Post-check
      await expect(me.heading).toHaveText('Kept');
      expect(await api.findUserByEmail(user.email)).toMatchObject({ displayName: 'Kept' });
    });
  });

  test.describe('update email', () => {
    test('changes the email: sign-in works with the new one only, and it is unverified', async ({ api, createUser, signInAs, cleanup }) => {
      const user = await createUser({ permissions: ['TRANSLATION_READ'] });
      const newEmail = `${uniqueId('moved-')}@e2e.localess.test`;
      cleanup.user(newEmail);
      const page = await signInAs(user);
      const me = new MePage(page);

      // Pre-check
      await me.goto(user.email);
      expect(await canSignIn(user.email, user.password)).toBe(true);
      expect(await canSignIn(newEmail, user.password)).toBe(false);

      // Action
      const form = await me.openEmail(user.password, newEmail);
      await me.save(form, 'User email has been updated.');

      // Post-check: the page, the API (same user), and sign-in.
      await page.reload();
      await expect(me.field('Email')).toHaveText(`Email: ${newEmail}`);
      await expect(me.field('Email Verified')).toHaveText('Email Verified: No');
      expect(await api.findUserByEmail(newEmail)).toMatchObject({ id: user.id });
      expect(await api.findUserByEmail(user.email)).toBeUndefined();
      expect(await canSignIn(newEmail, user.password)).toBe(true);
      expect(await canSignIn(user.email, user.password)).toBe(false);
    });

    test('refuses a wrong current password', async ({ api, createUser, signInAs }) => {
      const user = await createUser({ permissions: ['TRANSLATION_READ'] });
      const page = await signInAs(user);
      const me = new MePage(page);
      const newEmail = `${uniqueId('nope-')}@e2e.localess.test`;

      // Pre-check
      await me.goto(user.email);

      // Action
      const form = await me.openEmail('wrong-password', newEmail);
      await me.save(form, 'Current password is incorrect');

      // Post-check: unchanged.
      await page.reload();
      await expect(me.field('Email')).toHaveText(`Email: ${user.email}`);
      expect(await api.findUserByEmail(newEmail)).toBeUndefined();
      expect(await canSignIn(user.email, user.password)).toBe(true);
    });

    test('refuses an email another user has', async ({ api, createUser, signInAs }) => {
      const user = await createUser({ permissions: ['TRANSLATION_READ'] });
      const other = await createUser({ permissions: ['TRANSLATION_READ'] });
      const page = await signInAs(user);
      const me = new MePage(page);

      // Pre-check
      await me.goto(user.email);

      // Action
      const form = await me.openEmail(user.password, other.email);
      await me.save(form, 'User email can not be updated.');

      // Post-check: both accounts unchanged.
      await page.reload();
      await expect(me.field('Email')).toHaveText(`Email: ${user.email}`);
      expect(await api.findUserByEmail(user.email)).toMatchObject({ id: user.id });
      expect(await api.findUserByEmail(other.email)).toMatchObject({ id: other.id });
      expect(await canSignIn(other.email, other.password)).toBe(true);
    });
  });

  test.describe('update password', () => {
    test('changes the password: the old one stops working, other sessions end, this one stays @smoke', async ({
      createUser,
      signInAs,
      playwright,
      baseURL,
    }) => {
      const user = await createUser({ permissions: ['TRANSLATION_READ'] });
      const page = await signInAs(user);
      const me = new MePage(page);
      const otherSession = await anonymousRequest(playwright, baseURL, CSRF);

      try {
        // Pre-check: two sessions, both working.
        await me.goto(user.email);
        expect((await otherSession.post('/api/auth/login', { data: user })).ok()).toBe(true);
        expect((await otherSession.get('/api/auth/me')).status()).toBe(200);

        // Action
        const form = await me.openPassword(user.password, 'changed-password');
        await me.save(form, 'User password has been updated.');

        // Post-check
        expect((await otherSession.get('/api/auth/me')).status()).toBe(401);
        await page.reload();
        await expect(me.field('Email')).toHaveText(`Email: ${user.email}`);
        expect(await canSignIn(user.email, user.password)).toBe(false);
        expect(await canSignIn(user.email, 'changed-password')).toBe(true);
      } finally {
        await otherSession.dispose();
      }
    });

    test('refuses a wrong current password', async ({ createUser, signInAs }) => {
      const user = await createUser({ permissions: ['TRANSLATION_READ'] });
      const page = await signInAs(user);
      const me = new MePage(page);

      // Pre-check
      await me.goto(user.email);

      // Action
      const form = await me.openPassword('wrong-password', 'changed-password');
      await me.save(form, 'Current password is incorrect');

      // Post-check
      expect(await canSignIn(user.email, user.password)).toBe(true);
      expect(await canSignIn(user.email, 'changed-password')).toBe(false);
    });

    test('a new password under 6 characters can not be submitted; cancelling changes nothing', async ({ createUser, signInAs }) => {
      const user = await createUser({ permissions: ['TRANSLATION_READ'] });
      const page = await signInAs(user);
      const me = new MePage(page);

      // Pre-check
      await me.goto(user.email);

      // Action
      const form = await me.openPassword(user.password, '12345');
      await form.getByLabel('New Password').blur();

      // Post-check: the dialog states the rule (no separate error text) and Save stays disabled.
      await expect(form.getByText('Minimum 6 characters')).toBeVisible();
      await expect(form.getByRole('button', { name: 'Save' })).toBeDisabled();
      await form.getByLabel('New Password').fill('123456');
      await expect(form.getByRole('button', { name: 'Save' })).toBeEnabled();
      await form.getByRole('button', { name: 'Cancel' }).click();
      await expect(form).toBeHidden();
      expect(await canSignIn(user.email, user.password)).toBe(true);
    });
  });

  test.describe('locked account', () => {
    test('a locked user sees why, has no buttons, and the API refuses changes too', async ({ api, createUser, signInAs }) => {
      const user = await createUser({ lock: true, displayName: 'Locked', permissions: ['TRANSLATION_READ'] });
      const page = await signInAs(user);
      const me = new MePage(page);

      await me.goto(user.email);

      await expect(page.getByText("Your account is locked. You can't manage your personal data and password.")).toBeVisible();
      for (const button of ['Update Profile', 'Update Email', 'Update Password'] as const) {
        await expect(me.button(button)).toHaveCount(0);
      }
      const own = page.request;
      const headers = CSRF;
      expect((await own.patch('/api/app/me', { headers, data: { displayName: 'Hacked' } })).status()).toBe(403);
      expect(
        (await own.put('/api/app/me/password', { headers, data: { currentPassword: user.password, newPassword: 'abcdef' } })).status(),
      ).toBe(403);
      expect(await api.findUserByEmail(user.email)).toMatchObject({ displayName: 'Locked' });
    });
  });
});
