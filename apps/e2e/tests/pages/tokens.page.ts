import { expect, type Locator, type Page } from '@playwright/test';

import type { AppApi } from '../support/app-api';
import { dialog } from './dialogs';
import { confirmDialog, expectToast } from './notifications';

export type TokenTypeLabel = 'Public' | 'Preview' | 'Management';

export interface TokenDto {
  id: string;
  name: string;
  type: 'public' | 'preview' | 'management';
  /** The value; never listed for a management token (shown once, when it is created). */
  token?: string;
}

/** The space's tokens, newest first, from the App API (one page of 100: a test space has a few). */
export async function tokensOf(api: AppApi, spaceId: string): Promise<TokenDto[]> {
  return (await api.get<{ items: TokenDto[] }>(`/api/app/spaces/${spaceId}/tokens?size=100`)).items;
}

/** A token's value by name (fails if there is no such token or it has no listed value). */
export async function tokenValue(api: AppApi, spaceId: string, name: string): Promise<string> {
  const token = (await tokensOf(api, spaceId)).find(it => it.name === name);
  expect(token?.token, `value of token '${name}'`).toBeDefined();
  return token!.token!;
}

/** Space → Settings → Access Tokens (`/features/spaces/:spaceId/settings/tokens`). */
export class TokensPage {
  constructor(private readonly page: Page) {}

  async goto(spaceId: string): Promise<void> {
    await this.page.goto(`/features/spaces/${spaceId}/settings/tokens`);
    // Every space has its auto-generated preview token: the table has loaded once it is listed.
    await expect(this.row('Auto Generated Preview Token')).toBeVisible();
  }

  row(name: string): Locator {
    return this.page.getByRole('row').filter({ hasText: name });
  }

  /** Opens "Add Token" and fills the name and type, without saving. */
  async openAdd(name: string, type: TokenTypeLabel = 'Public'): Promise<Locator> {
    await this.page.getByRole('button', { name: 'Add Token' }).click();
    const form = await dialog(this.page, 'Token Form');
    await form.getByLabel('Name', { exact: true }).fill(name);
    // The radio input is visually hidden: click its label's title, as a user does. (The label also holds a
    // description, so the radio's name only starts with the type.)
    await form.getByText(type, { exact: true }).click();
    await expect(form.getByRole('radio', { name: new RegExp(`^${type}`) })).toBeChecked();
    return form;
  }

  /** Creates a token. A management token's value is then shown in a dialog that stays open (see `copiedDialog`). */
  async create(name: string, type: TokenTypeLabel): Promise<void> {
    const form = await this.openAdd(name, type);
    await form.getByRole('button', { name: 'Save' }).click();
    await expectToast(this.page, 'Token has been created.');
  }

  /** The dialog that shows a management token's value once. */
  copiedDialog(): Promise<Locator> {
    return dialog(this.page, 'Copy your token');
  }

  /** Edits the name and the Cache TTL (all that can be edited). */
  async edit(name: string, values: { name: string; cacheTtl: string }): Promise<void> {
    const form = await this.openEdit(name, values);
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'Token has been updated.');
  }

  /** Opens Edit and fills the name and Cache TTL, without saving. */
  async openEdit(name: string, values: { name: string; cacheTtl: string }): Promise<Locator> {
    await this.row(name).getByRole('button', { name: 'Edit' }).click();
    const form = await dialog(this.page, 'Token Form');
    await expect(form.getByLabel('Name', { exact: true })).toHaveValue(name);
    await form.getByLabel('Name', { exact: true }).fill(values.name);
    await form.getByLabel('Cache TTL', { exact: true }).fill(values.cacheTtl);
    return form;
  }

  async regenerate(name: string): Promise<void> {
    await this.row(name).getByRole('button', { name: 'Regenerate' }).click();
    await confirmDialog(this.page, 'Regenerate Token');
    await expectToast(this.page, `Token '${name}' has been regenerated.`);
  }

  async delete(name: string): Promise<void> {
    await this.row(name).getByRole('button', { name: 'Delete' }).click();
    await confirmDialog(this.page, 'Delete Token');
    await expectToast(this.page, `Token '${name}' has been deleted.`);
  }
}
