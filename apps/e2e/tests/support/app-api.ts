import { type APIRequestContext, type APIResponse, expect } from '@playwright/test';

/**
 * The App API (`/api/app/**`) with the signed-in admin's session, for creating test data without the UI.
 * State-changing calls need `X-Requested-With` (CSRF guard, apps/server/src/auth/auth.guard.ts).
 */
/** One page of a paged App API list (`Page<T>` of @localess/shared). */
interface Page<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

export class AppApi {
  constructor(private readonly request: APIRequestContext) {}

  // --- Spaces ---------------------------------------------------------------------------------------------

  /** A space, filled from a template in the same request (test templates: LOCALESS_TEST_TEMPLATES). */
  createSpace(name: string, template?: string): Promise<{ id: string; name: string }> {
    return this.send('post', '/api/app/spaces', template ? { name, template } : { name });
  }

  /** Every space, page after page (`GET /api/app/spaces` answers one page). */
  listSpaces(): Promise<SpaceDto[]> {
    return this.everyPage<SpaceDto>('/api/app/spaces');
  }

  /** The space, or undefined once it is gone. */
  async findSpace(id: string): Promise<SpaceDto | undefined> {
    const response = await this.request.get(`/api/app/spaces/${id}`);
    if (response.status() === 404) return undefined;
    return expectOk(response, `GET space ${id}`);
  }

  /** The space's Visual Editor environments, in their order (`GET /api/app/spaces/:id/environments`). */
  findSpaceEnvironments(id: string): Promise<EnvironmentDto[]> {
    return this.everyPage<EnvironmentDto>(`/api/app/spaces/${id}/environments`);
  }

  /** Deletes the space; one already gone (deleted by the test) is fine. */
  deleteSpace(id: string): Promise<void> {
    return this.delete(`/api/app/spaces/${id}`);
  }

  addEnvironment(spaceId: string, environment: { name: string; url: string }): Promise<unknown> {
    return this.send('post', `/api/app/spaces/${spaceId}/environments`, environment);
  }

  addLocale(spaceId: string, localeId: string): Promise<unknown> {
    return this.send('post', `/api/app/spaces/${spaceId}/locales`, { id: localeId });
  }

  // --- Translations ---------------------------------------------------------------------------------------

  createTranslation(
    spaceId: string,
    body: { key: string; locales: Record<string, string>; labels?: string[]; description?: string },
  ): Promise<{ id: string; key: string }> {
    return this.send('post', `/api/app/spaces/${spaceId}/translations`, body);
  }

  publishTranslations(spaceId: string): Promise<unknown> {
    return this.send('post', `/api/app/spaces/${spaceId}/translations/publish`);
  }

  // --- Schemas --------------------------------------------------------------------------------------------

  /** A schema with fields: create (name and type only), then set the fields. */
  async createSchema(
    spaceId: string,
    body: { name: string; type: 'ROOT' | 'NODE' | 'ENUM'; displayName?: string; fields?: SchemaFieldInput[] },
  ): Promise<{ id: string; name: string }> {
    const { fields, ...create } = body;
    const schema = await this.send<{ id: string; name: string }>('post', `/api/app/spaces/${spaceId}/schemas`, create);
    if (fields) {
      await this.send('put', `/api/app/spaces/${spaceId}/schemas/${schema.id}`, { displayName: body.displayName, fields });
    }
    return schema;
  }

  // --- Contents -------------------------------------------------------------------------------------------

  createFolder(spaceId: string, body: { name: string; slug: string; parentId?: string }): Promise<ContentDto> {
    return this.send('post', `/api/app/spaces/${spaceId}/contents`, { kind: 'FOLDER', ...body });
  }

  createDocument(spaceId: string, body: { name: string; slug: string; schema: string; parentId?: string }): Promise<ContentDto> {
    return this.send('post', `/api/app/spaces/${spaceId}/contents`, { kind: 'DOCUMENT', ...body });
  }

  /** `assets`: ids of the assets the data uses (what asset usage counts). */
  saveDocumentData(spaceId: string, document: ContentDto, values: Record<string, unknown>, assets: string[] = []): Promise<unknown> {
    return this.send('put', `/api/app/spaces/${spaceId}/contents/${document.id}/data`, {
      data: { _id: document.id, _schema: document.schema, ...values },
      assets,
      links: [],
      references: [],
    });
  }

  publishContent(spaceId: string, contentId: string): Promise<unknown> {
    return this.send('post', `/api/app/spaces/${spaceId}/contents/${contentId}/publish`);
  }

  // --- Assets ---------------------------------------------------------------------------------------------

  createAssetFolder(spaceId: string, name: string, parentId?: string): Promise<{ id: string; name: string }> {
    return this.send('post', `/api/app/spaces/${spaceId}/assets/folders`, { name, ...(parentId ? { parentId } : {}) });
  }

  async uploadAsset(
    spaceId: string,
    file: { name: string; mimeType: string; buffer: Buffer },
    parentId = '',
  ): Promise<{ id: string; name: string; extension: string }> {
    const response = await this.request.post(`/api/app/spaces/${spaceId}/assets/files`, {
      headers: CSRF,
      // Field parts before the file part: the server reads them as the stream goes by.
      multipart: { parentId, file },
    });
    return expectOk(response, 'upload asset');
  }

  // --- Tokens ---------------------------------------------------------------------------------------------

  createToken(
    spaceId: string,
    body: { name: string; type: 'public' | 'preview' | 'management'; cacheTtl?: number },
  ): Promise<{ id: string; token: string }> {
    return this.send('post', `/api/app/spaces/${spaceId}/tokens`, body);
  }

  // --- Webhooks -------------------------------------------------------------------------------------------

  createWebhook(
    spaceId: string,
    body: { name: string; url: string; events: string[]; secret?: string },
  ): Promise<{ id: string; name: string }> {
    return this.send('post', `/api/app/spaces/${spaceId}/webhooks`, body);
  }

  // --- Users ----------------------------------------------------------------------------------------------

  createUser(body: {
    email: string;
    password: string;
    displayName?: string;
    role?: 'ADMIN' | 'CUSTOM' | null;
    permissions?: string[];
    lock?: boolean;
  }): Promise<{ id: string; email: string }> {
    return this.send('post', '/api/app/users', body);
  }

  /** Every user, page after page (`GET /api/app/users` answers one page). */
  listUsers(): Promise<UserDto[]> {
    return this.everyPage<UserDto>('/api/app/users');
  }

  /** By the server's search (email or display name contains), then the exact email. */
  async findUserByEmail(email: string): Promise<UserDto | undefined> {
    const page = await this.get<Page<UserDto>>(`/api/app/users?size=100&search=${encodeURIComponent(email)}`);
    return page.items.find(it => it.email === email);
  }

  /** All items of a paged list, 100 at a time. */
  private async everyPage<T>(path: string): Promise<T[]> {
    const items: T[] = [];
    for (let page = 0; ; page++) {
      const answer = await this.get<Page<T>>(`${path}?page=${page}&size=100`);
      items.push(...answer.items);
      if ((page + 1) * answer.size >= answer.total) return items;
    }
  }

  /** Deletes the user; one already gone (deleted by the test) is fine. */
  deleteUser(id: string): Promise<void> {
    return this.delete(`/api/app/users/${id}`);
  }

  passwordResetLink(userId: string): Promise<{ url: string; expiresAt: string }> {
    return this.send('post', `/api/app/users/${userId}/password-reset-link`);
  }

  // --------------------------------------------------------------------------------------------------------

  async get<T>(path: string): Promise<T> {
    return expectOk(await this.request.get(path), `GET ${path}`);
  }

  async send<T>(method: 'post' | 'put' | 'patch', path: string, data?: unknown): Promise<T> {
    const response = await this.request[method](path, { headers: CSRF, ...(data === undefined ? {} : { data }) });
    return expectOk(response, `${method.toUpperCase()} ${path}`);
  }

  /** DELETE that fails on anything but success or 404 (already gone): a silent failure would leak test data. */
  async delete(path: string): Promise<void> {
    const response = await this.request.delete(path, { headers: CSRF });
    if (response.status() === 404) return;
    await expectOk(response, `DELETE ${path}`);
  }
}

/** A space as the App API answers it: `GET /spaces/:id` adds its default locale and its locales (`spaceLocales`). */
export interface SpaceDto {
  id: string;
  name: string;
  defaultLocaleId: string;
  defaultLocale?: { id: string; name: string };
  spaceLocales?: { position: number; locale: { id: string; name: string } }[];
}

export interface EnvironmentDto {
  id: string;
  name: string;
  url: string;
  position: number;
}

export interface UserDto {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role?: 'ADMIN' | 'CUSTOM' | null;
  permissions?: string[];
  lock?: boolean;
  disabled?: boolean;
  /** `password`, `google.com`, `microsoft.com`. */
  providers?: string[];
}

export interface SchemaFieldInput {
  name: string;
  kind: string;
  displayName?: string;
  required?: boolean;
  translatable?: boolean;
  description?: string;
  defaultValue?: string;
  /** OPTION / OPTIONS: the enum schema's name. */
  source?: string;
  /** SCHEMA / SCHEMAS: allowed node schema names. */
  schemas?: string[];
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  minValues?: number;
  maxValues?: number;
}

export interface ContentDto {
  id: string;
  kind: 'DOCUMENT' | 'FOLDER';
  name: string;
  slug: string;
  fullSlug: string;
  schema?: string;
}

export const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };

async function expectOk<T>(response: APIResponse, what: string): Promise<T> {
  expect(response.ok(), `${what}: ${response.status()} ${await response.text()}`).toBeTruthy();
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
