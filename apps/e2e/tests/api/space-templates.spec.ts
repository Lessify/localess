import { CSRF } from '../support/app-api';
import { E2E_BASE_URL } from '../support/env';
import { expect, test, uniqueName } from '../support/fixtures';

const TEST_TEMPLATE = 'translations_large';

// Test templates (prepared spaces with large generated data) exist only where LOCALESS_TEST_TEMPLATES is set: the e2e
// server (playwright.config.ts) and `pnpm dev`. A running server given by E2E_BASE_URL is the Docker image as shipped
// (the `e2e-docker` CI job), which must not offer them.
test.describe('Space templates', () => {
  test('the production image offers no test templates @smoke', async ({ api, request }) => {
    test.skip(!E2E_BASE_URL, 'only against a running server (the Docker image as shipped)');
    expect(await api.get<string[]>('/api/app/spaces/templates')).toEqual(['blog', 'ecommerce', 'marketing']);

    const name = uniqueName('E2E Refused');
    const response = await request.post('/api/app/spaces', { headers: CSRF, data: { name, template: TEST_TEMPLATE } });
    expect(response.status()).toBe(400);
    expect((await api.listSpaces()).map(it => it.name)).not.toContain(name);
  });

  test('the e2e server offers the test templates after the others', async ({ api }) => {
    test.skip(!!E2E_BASE_URL, 'the e2e server only (LOCALESS_TEST_TEMPLATES=true)');
    expect(await api.get<string[]>('/api/app/spaces/templates')).toEqual([
      'blog',
      'ecommerce',
      'marketing',
      TEST_TEMPLATE,
      'contents_fields',
      'assets_large',
      'contents_large',
    ]);
  });
});
