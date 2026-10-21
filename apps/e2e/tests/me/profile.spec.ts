import { MePage } from '../pages/me.page';
import { Shell } from '../pages/shell.page';
import { CSRF } from '../support/app-api';
import { anonymousRequest, expect, test, uniqueId } from '../support/fixtures';

// Every test works on its own user (the shared admin must not change) and follows pre-check → action (UI) →
// post-check (the page, again after a reload, the API, and what the account can now do).
test.describe('Me → profile', () => {
  test.describe('view', () => {
    test('opens from the user menu and shows the role, and what it may do', async ({ createUser, signInAs }) => {
      const user = await createUser({ role: 'VIEWER' });
      const page = await signInAs(user);
      const me = new MePage(page);
      await page.goto('/features/welcome');

      const menu = await new Shell(page).openUserMenu(user.email);
      await menu.getByRole('menuitem', { name: 'Profile' }).click();

      await expect(page).toHaveURL(/\/features\/me$/);
      await expect(me.field('Email')).toHaveText(`Email: ${user.email}`);
      await expect(me.field('Email Verified')).toHaveText('Email Verified: No');
      await expect(me.field('Role')).toHaveText('Role: Viewer');
      await expect(
        page.getByText('Reviews and follows along: reads contents, assets, translations and schemas; changes nothing.'),
      ).toBeVisible();
      for (const button of ['Update Profile', 'Update Email', 'Update Password'] as const) {
        await expect(me.button(button)).toBeVisible();
      }
    });

    test('shows an admin as Admin, and that they may do everything', async ({ createUser, signInAs }) => {
      const user = await createUser({ role: 'ADMIN' });
      const page = await signInAs(user);
      const me = new MePage(page);

      await me.goto(user.email);

      await expect(me.field('Role')).toHaveText('Role: Admin');
      await expect(page.getByText(/^Runs the installation: invites and manages users/)).toBeVisible();
    });
  });

  test.describe('update profile', () => {
    test('changes the display name: on the page, in the user menu, for admins and in the API @smoke', async ({
      api,
      createUser,
      signInAs,
    }) => {
      const user = await createUser({ displayName: 'Before', role: 'VIEWER' });
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
      const user = await createUser({ role: 'VIEWER' });
      const page = await signInAs(user);
      const me = new MePage(page);
      const avatarUrl = 'https://images.example.com/avatar.png';

      // Pre-check: the default avatar.
      await me.goto(user.email);
      await expect(me.avatar).toHaveAttribute('src', /account_circle\.svg/);

      // Action 1: a valid URL. Post-check.
      await me.updateProfile({ photoUrl: avatarUrl });
      await expect(me.avatar).toHaveAttribute('src', avatarUrl);
      await page.reload();
      await expect(me.avatar).toHaveAttribute('src', avatarUrl);
      expect((await api.findUserByEmail(user.email))?.photoUrl).toBe(avatarUrl);

      // Action 2: not a URL. Post-check: refused, the valid one stays.
      const form = await me.openProfile({ photoUrl: 'not a url' });
      await me.save(form, 'User can not be updated.');
      await page.reload();
      await expect(me.avatar).toHaveAttribute('src', avatarUrl);
      expect((await api.findUserByEmail(user.email))?.photoUrl).toBe(avatarUrl);
    });

    test('cancelling keeps the display name', async ({ api, createUser, signInAs }) => {
      const user = await createUser({ displayName: 'Kept', role: 'VIEWER' });
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
    test('changes the email: sign-in works with the new one only, and it is unverified', async ({
      api,
      createUser,
      signInAs,
      cleanup,
      probe,
    }) => {
      const user = await createUser({ role: 'VIEWER' });
      const newEmail = `${uniqueId('moved-')}@e2e.localess.test`;
      cleanup.user(newEmail);
      const page = await signInAs(user);
      const me = new MePage(page);

      // Pre-check
      await me.goto(user.email);
      expect(await probe.canSignIn(user.email, user.password)).toBe(true);
      expect(await probe.canSignIn(newEmail, user.password)).toBe(false);

      // Action
      const form = await me.openEmail(user.password, newEmail);
      await me.save(form, 'User email has been updated.');

      // Post-check: the page, the API (same user), and sign-in.
      await page.reload();
      await expect(me.field('Email')).toHaveText(`Email: ${newEmail}`);
      await expect(me.field('Email Verified')).toHaveText('Email Verified: No');
      expect(await api.findUserByEmail(newEmail)).toMatchObject({ id: user.id });
      expect(await api.findUserByEmail(user.email)).toBeUndefined();
      expect(await probe.canSignIn(newEmail, user.password)).toBe(true);
      expect(await probe.canSignIn(user.email, user.password)).toBe(false);
    });

    test('refuses a wrong current password', async ({ api, createUser, signInAs, probe }) => {
      const user = await createUser({ role: 'VIEWER' });
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
      expect(await probe.canSignIn(user.email, user.password)).toBe(true);
    });

    test('refuses an email another user has', async ({ api, createUser, signInAs, probe }) => {
      const user = await createUser({ role: 'VIEWER' });
      const other = await createUser({ role: 'VIEWER' });
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
      expect(await probe.canSignIn(other.email, other.password)).toBe(true);
    });
  });

  test.describe('update password', () => {
    test('changes the password: the old one stops working, other sessions end, this one stays @smoke', async ({
      createUser,
      signInAs,
      playwright,
      baseURL,
      probe,
    }) => {
      const user = await createUser({ role: 'VIEWER' });
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
        expect(await probe.canSignIn(user.email, user.password)).toBe(false);
        expect(await probe.canSignIn(user.email, 'changed-password')).toBe(true);
      } finally {
        await otherSession.dispose();
      }
    });

    test('refuses a wrong current password', async ({ createUser, signInAs, probe }) => {
      const user = await createUser({ role: 'VIEWER' });
      const page = await signInAs(user);
      const me = new MePage(page);

      // Pre-check
      await me.goto(user.email);

      // Action
      const form = await me.openPassword('wrong-password', 'changed-password');
      await me.save(form, 'Current password is incorrect');

      // Post-check
      expect(await probe.canSignIn(user.email, user.password)).toBe(true);
      expect(await probe.canSignIn(user.email, 'changed-password')).toBe(false);
    });

    test('a new password under 6 characters can not be submitted; cancelling changes nothing', async ({ createUser, signInAs, probe }) => {
      const user = await createUser({ role: 'VIEWER' });
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
      expect(await probe.canSignIn(user.email, user.password)).toBe(true);
    });
  });
});
