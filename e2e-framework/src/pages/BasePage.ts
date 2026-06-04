import { Page, Locator } from '@playwright/test';

/**
 * Base Page Object providing common utilities for all page objects.
 */
export abstract class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Navigate to the page URL */
  abstract navigate(): Promise<void>;

  /** Wait for page to be fully loaded */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /** Get the current page title */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /** Get the current page URL */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /** Click an element */
  protected async click(locator: Locator): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  /** Fill a text input */
  protected async fill(locator: Locator, text: string): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    await locator.clear();
    await locator.fill(text);
  }

  /** Get text content of an element */
  protected async getText(locator: Locator): Promise<string> {
    await locator.waitFor({ state: 'visible' });
    return (await locator.textContent()) ?? '';
  }

  /** Check if element is visible */
  protected async isVisible(locator: Locator): Promise<boolean> {
    return locator.isVisible();
  }

  /** Wait for an element to be visible */
  protected async waitForElement(locator: Locator, timeout = 10000): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
  }

  /** Take a screenshot */
  async takeScreenshot(name: string): Promise<Buffer> {
    return this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }
}
