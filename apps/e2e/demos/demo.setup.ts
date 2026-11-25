import { test as setup } from '@playwright/test';

import { AppApi, CSRF } from '../tests/support/app-api';
import { DEMO_ADMIN, DEMO_STATE } from './support/demo';

// Signs the demo admin in (no video), gives them a name, and removes the seeded "Hello World" space so the space
// switcher shows only what the demos create.
setup('sign in as the demo admin', async ({ request }) => {
  const login = await request.post('/api/auth/login', { headers: CSRF, data: { email: DEMO_ADMIN.email, password: DEMO_ADMIN.password } });
  if (!login.ok()) throw new Error(`demo admin sign-in: ${login.status()} ${await login.text()}`);
  const api = new AppApi(request);
  await api.send('patch', '/api/app/me', { displayName: DEMO_ADMIN.displayName });
  for (const space of await api.listSpaces()) await api.deleteSpace(space.id);
  await request.storageState({ path: DEMO_STATE });
});
