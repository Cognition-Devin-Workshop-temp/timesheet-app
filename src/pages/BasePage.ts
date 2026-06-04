import { type Page, type Locator, expect } from '@playwright/test';
import { config } from '../utils/config';

/**
 * Base page providing shared helpers used by every page object.
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ── Navigation ──────────────────────────────────────────────

  async navigate(path = '/') {
    await this.page.goto(path, {
      waitUntil: 'domcontentloaded',
      timeout: config.timeouts.navigation,
    });
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('domcontentloaded', {
      timeout: config.timeouts.navigation,
    });
  }

  // ── Common interactions ────────────────────────────────────

  async click(locator: Locator) {
    await locator.waitFor({ state: 'visible', timeout: config.timeouts.element });
    await locator.click();
  }

  async fill(locator: Locator, text: string) {
    await locator.waitFor({ state: 'visible', timeout: config.timeouts.element });
    await locator.clear();
    await locator.fill(text);
  }

  async getText(locator: Locator): Promise<string> {
    await locator.waitFor({ state: 'visible', timeout: config.timeouts.element });
    return (await locator.textContent()) ?? '';
  }

  async isVisible(locator: Locator, timeout: number = config.timeouts.short): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  // ── Popups / overlays ──────────────────────────────────────

  /** Dismiss the Flipkart login popup that appears on first visit. */
  async dismissLoginPopup() {
    const closeButton = this.page.locator('button:has-text("✕")');
    if (await this.isVisible(closeButton, 3_000)) {
      await closeButton.click();
    }
  }

  // ── Assertions ─────────────────────────────────────────────

  async expectUrlContains(substring: string) {
    await expect(this.page).toHaveURL(new RegExp(substring));
  }

  async expectTitleContains(substring: string) {
    await expect(this.page).toHaveTitle(new RegExp(substring, 'i'));
  }

  // ── Utilities ──────────────────────────────────────────────

  async getPageTitle(): Promise<string> {
    return this.page.title();
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
  }

  async scrollToBottom() {
    await this.page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
  }

  async scrollToElement(locator: Locator) {
    await locator.scrollIntoViewIfNeeded();
  }

  /** Switch to a newly opened tab and return its Page. */
  async switchToNewTab(triggerAction: () => Promise<void>): Promise<Page> {
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page'),
      triggerAction(),
    ]);
    await newPage.waitForLoadState('domcontentloaded');
    return newPage;
  }
}
