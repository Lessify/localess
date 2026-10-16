import {
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  expect,
  type JSHandle,
  type Page,
  test as base,
} from '@playwright/test';

import { AppApi, CSRF } from './app-api';
import { AUTH_STATE } from './env';

/** A space created through the App API for one test, deleted afterwards. */
export interface TestSpace {
  id: string;
  name: string;
}

/** A user created through the App API for one test, deleted afterwards. */
export interface TestUser {
  id: string;
  email: string;
  password: string;
}

export interface UserOptions {
  role?: 'ADMIN' | 'CUSTOM' | null;
  permissions?: string[];
  displayName?: string;
  lock?: boolean;
}

/** A unique suffix: the database lives for the whole run and tests run in parallel. */
export function unique(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** A unique name within the 30-character limit of a space or token name. */
export function uniqueName(prefix: string): string {
  return `${prefix} ${unique()}`;
}

/** A unique identifier-like name (schema names, slugs, translation keys). */
export function uniqueId(prefix: string): string {
  return `${prefix}${unique()}`;
}

interface Fixtures {
  /** Set once teardown starts deleting test data: a page still open then may legitimately get 404s. */
  lifecycle: { tearingDown: boolean };
  /** App errors a test expects (known bugs): matched against the error description. */
  allowedAppErrors: RegExp[];
  /** The App API as the seeded admin. */
  api: AppApi;
  /** A fresh space (default locale English) for this test. */
  space: TestSpace;
  /** Creates users for this test (unique email, known password); they are deleted afterwards. */
  createUser: (options?: UserOptions) => Promise<TestUser>;
  /** A page in its own browser context, signed in as the given user. */
  signInAs: (user: TestUser) => Promise<Page>;
  /** A page in its own browser context, signed out (no session, no localStorage). */
  signedOutPage: () => Promise<Page>;
  /** Deletes, after the test, spaces and users a test creates through the UI (by name / email). */
  cleanup: { space: (name: string) => void; user: (email: string) => void };
}

export const test = base.extend<Fixtures>({
  context: async ({ context, baseURL }, use) => {
    await offline(context, baseURL);
    await use(context);
  },

  allowedAppErrors: [[], { option: true }],

  // Set up before `page`, `space` and `createUser`, so it is torn down after them.
  lifecycle: async ({}, use) => {
    await use({ tearingDown: false });
  },

  // Fails the test on an uncaught error in the app, or one reported to Angular's ErrorHandler (the "An error
  // occurred." toast): a broken page often still renders something.
  page: async ({ page, allowedAppErrors, lifecycle }, use) => {
    const errors = watchContext(page, lifecycle);
    await use(page);
    await expectNoAppErrors(errors, allowedAppErrors);
  },

  api: async ({ playwright, baseURL }, use) => {
    const request = await playwright.request.newContext({ baseURL, storageState: AUTH_STATE });
    await use(new AppApi(request));
    await request.dispose();
  },

  space: async ({ api, lifecycle }, use) => {
    const space = await api.createSpace(uniqueName('E2E'));
    await use(space);
    lifecycle.tearingDown = true;
    await api.deleteSpace(space.id);
  },

  createUser: async ({ api, lifecycle }, use) => {
    const created: string[] = [];
    await use(async (options = {}) => {
      const email = `${uniqueId('user-')}@e2e.localess.test`;
      const password = `pw-${unique()}`;
      const user = await api.createUser({ email, password, role: 'CUSTOM', permissions: [], ...options });
      created.push(user.id);
      return { id: user.id, email, password };
    });
    lifecycle.tearingDown = true;
    await settleAll(created.map(id => () => api.deleteUser(id)));
  },

  cleanup: async ({ api, lifecycle }, use) => {
    const spaces: string[] = [];
    const users: string[] = [];
    await use({ space: name => spaces.push(name), user: email => users.push(email) });
    lifecycle.tearingDown = true;
    await settleAll([
      ...(await api.listSpaces()).filter(it => spaces.includes(it.name)).map(it => () => api.deleteSpace(it.id)),
      ...(await api.listUsers()).filter(it => users.includes(it.email)).map(it => () => api.deleteUser(it.id)),
    ]);
  },

  signInAs: async ({ browser, baseURL, allowedAppErrors, lifecycle }, use) => {
    const contexts: BrowserContext[] = [];
    const errors: Promise<string>[] = [];
    await use(async user => {
      const context = await signedOutContext(browser, baseURL);
      contexts.push(context);
      const response = await context.request.post('/api/auth/login', {
        headers: CSRF,
        data: { email: user.email, password: user.password },
      });
      expect(response.ok(), `sign in as ${user.email}: ${response.status()}`).toBeTruthy();
      const page = await context.newPage();
      errors.push(...watchContext(page, lifecycle));
      return page;
    });
    for (const context of contexts) await context.close();
    await expectNoAppErrors(errors, allowedAppErrors);
  },

  signedOutPage: async ({ browser, baseURL, allowedAppErrors, lifecycle }, use) => {
    const contexts: BrowserContext[] = [];
    const errors: Promise<string>[] = [];
    await use(async () => {
      const context = await signedOutContext(browser, baseURL);
      contexts.push(context);
      const page = await context.newPage();
      errors.push(...watchContext(page, lifecycle));
      return page;
    });
    for (const context of contexts) await context.close();
    await expectNoAppErrors(errors, allowedAppErrors);
  },
});

/** Runs every cleanup step, even when one fails, then fails with all their errors (a leak should not go unseen). */
async function settleAll(steps: (() => Promise<unknown>)[]): Promise<void> {
  const failed = (await Promise.allSettled(steps.map(step => step()))).filter(it => it.status === 'rejected');
  expect(
    failed.map(it => String(it.reason)),
    'cleanup',
  ).toEqual([]);
}

/**
 * Collects the app's errors in a page and in every page later opened in its context (popups, new tabs), until
 * teardown starts (see `lifecycle`). The array grows while the test runs: read it at teardown.
 */
function watchContext(page: Page, lifecycle: { tearingDown: boolean }): Promise<string>[] {
  const errors: Promise<string>[] = [];
  watchAppErrors(page, lifecycle, errors);
  page.context().on('page', other => watchAppErrors(other, lifecycle, errors));
  return errors;
}

/** Collects a page's uncaught errors, errors reported to Angular's ErrorHandler and server errors (5xx) of its API calls. */
function watchAppErrors(page: Page, lifecycle: { tearingDown: boolean }, errors: Promise<string>[]): void {
  page.on('pageerror', error => {
    if (lifecycle.tearingDown) return;
    errors.push(Promise.resolve(`uncaught ${error.name}: ${error.message} @ ${page.url()}\n${error.stack ?? ''}`));
  });
  page.on('console', message => {
    // ErrorHandler logs console.error('ERROR', error); the text alone is a minified class name.
    if (!lifecycle.tearingDown && message.type() === 'error' && message.text().startsWith('ERROR')) {
      errors.push(describeConsoleError(message.args()).then(text => `ErrorHandler: ${text} @ ${page.url()}`));
    }
  });
  // A server error the app handles quietly (no toast, an empty list) still means something broke.
  page.on('response', response => {
    if (!lifecycle.tearingDown && response.status() >= 500 && new URL(response.url()).pathname.startsWith('/api/')) {
      errors.push(Promise.resolve(`server ${response.status()} ${response.request().method()} ${response.url()} @ ${page.url()}`));
    }
  });
}

async function expectNoAppErrors(errors: Promise<string>[], allowed: RegExp[]): Promise<void> {
  const reported = (await Promise.all(errors)).filter(error => !allowed.some(it => it.test(error)));
  expect(reported, 'errors in the app').toEqual([]);
}

/** The error passed to console.error, readable: HttpErrorResponse has a status and a URL. */
async function describeConsoleError(args: JSHandle[]): Promise<string> {
  const parts = await Promise.all(
    args.slice(1).map(arg =>
      arg
        .evaluate(value => {
          const error = value as { name?: string; message?: string; status?: number; url?: string };
          return error && typeof error === 'object'
            ? [error.name, error.status, error.url, error.message].filter(it => it !== undefined).join(' ')
            : String(value);
        })
        .catch(() => '(unreadable)'),
    ),
  );
  return parts.join(' ');
}

/**
 * Only the server under test (and loopback, for sites a test serves) answers: anything else (GitHub's release check,
 * fonts, ...) is aborted. Keeps runs
 * independent of the internet (and of GitHub's rate limit), and checks that the app works on an offline install.
 */
async function offline(context: BrowserContext, baseURL: string | undefined): Promise<void> {
  const origin = new URL(baseURL ?? 'http://localhost').origin;
  // Loopback stays reachable: pages a test serves itself (the Visual Editor's preview site).
  await context.route(
    url => url.origin !== origin && url.hostname !== '127.0.0.1',
    route => route.abort('internetdisconnected'),
  );
}

/** A browser context like a fresh browser: no session cookie, no localStorage, offline (see `offline`). */
async function signedOutContext(browser: Browser, baseURL: string | undefined): Promise<BrowserContext> {
  const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  await offline(context, baseURL);
  return context;
}

export { expect };

/**
 * An HTTP client with no session cookie (`playwright.request.newContext()` would inherit the project's admin session).
 * Dispose it when done.
 */
export function anonymousRequest(
  playwright: { request: { newContext: (options: object) => Promise<APIRequestContext> } },
  baseURL: string | undefined,
  extraHTTPHeaders?: Record<string, string>,
): Promise<APIRequestContext> {
  return playwright.request.newContext({ baseURL, extraHTTPHeaders, storageState: { cookies: [], origins: [] } });
}
