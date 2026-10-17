import type { APIRequestContext } from '@playwright/test';

export interface Access {
  signIn: boolean;
  role?: string | null;
  permissions?: string[];
  /** Status of `GET /api/app/users` and `GET /api/app/spaces` for this user. */
  users?: number;
  spaces?: number;
}

/**
 * Signs in with an email and password in an HTTP client of its own (not the browser's session) and probes what that
 * user may do. The `probe` fixture gives one (with the CSRF header, no session to start with).
 */
export class SessionProbe {
  constructor(private readonly client: APIRequestContext) {}

  /** The client, signed in as the user of the last `canSignIn` / `accessOf`, for further calls as them. */
  get request(): APIRequestContext {
    return this.client;
  }

  async canSignIn(email: string, password: string): Promise<boolean> {
    await this.client.post('/api/auth/logout');
    return (await this.client.post('/api/auth/login', { data: { email, password } })).ok();
  }

  async accessOf(email: string, password: string): Promise<Access> {
    if (!(await this.canSignIn(email, password))) return { signIn: false };
    const { user } = await (await this.client.get('/api/auth/me')).json();
    return {
      signIn: true,
      role: user.role ?? null,
      permissions: user.permissions ?? [],
      users: (await this.client.get('/api/app/users')).status(),
      spaces: (await this.client.get('/api/app/spaces')).status(),
    };
  }
}
