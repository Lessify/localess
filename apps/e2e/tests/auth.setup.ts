import { test as setup } from '@playwright/test';

import { LoginPage } from './pages/login.page';
import { ADMIN, AUTH_STATE } from './support/env';

setup('sign in as the seeded admin', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.signIn(ADMIN.email, ADMIN.password);
  await login.expectSignedIn();
  await page.context().storageState({ path: AUTH_STATE });
});
