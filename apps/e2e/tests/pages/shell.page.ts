import { expect, type Locator, type Page } from '@playwright/test';

/** The app shell: sidebar (space switcher, navigation, user menu) and header. */
export class Shell {
  constructor(private readonly page: Page) {}

  get sidebar(): Locator {
    return this.page.locator('[data-sidebar="sidebar"]').first();
  }

  /** A navigation entry in the sidebar ("Translations", "Users", ...). */
  navLink(name: string): Locator {
    return this.sidebar.getByRole('link', { name, exact: true });
  }

  async openUserMenu(email: string): Promise<Locator> {
    await this.page.getByRole('button', { name: new RegExp(email.replace(/[.+]/g, '\\$&')) }).click();
    const menu = this.page.getByRole('menu');
    await expect(menu).toBeVisible();
    return menu;
  }

  async logOut(email: string): Promise<void> {
    const menu = await this.openUserMenu(email);
    await menu.getByRole('menuitem', { name: 'Log out' }).click();
    await expect(this.page).toHaveURL(/\/auth\/login/);
  }

  /**
   * Picks a space in the switcher. The space list updates live (other tests create and delete spaces) and a re-render
   * closes the open menu, so opening is retried until the item can be clicked, as `rowMenu` does.
   */
  async switchSpace(name: string): Promise<void> {
    const menu = this.page.getByRole('menu');
    await expect(async () => {
      if (!(await menu.isVisible())) await this.sidebar.getByRole('button').first().click();
      await this.page.getByRole('menuitemradio', { name }).click({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    // The menu closes on the pick.
    await expect(menu).toHaveCount(0);
    await expect(this.page).toHaveURL(/\/dashboard/);
  }
}
