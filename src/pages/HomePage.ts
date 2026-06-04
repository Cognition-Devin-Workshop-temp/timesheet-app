import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for the Flipkart home page.
 */
export class HomePage extends BasePage {
  // ── Locators ───────────────────────────────────────────────

  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly logo: Locator;
  readonly cartIcon: Locator;
  readonly loginButton: Locator;
  readonly categoryMenu: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.locator('input[name="q"], input[title="Search for Products, Brands and More"]').first();
    this.searchButton = page.locator('button[type="submit"], button:has(svg)').first();
    this.logo = page.locator('a[title="Flipkart"], img[alt="Flipkart"]').first();
    this.cartIcon = page.locator('a[href="/viewcart"]').first();
    this.loginButton = page.locator('a[href*="login"], a:has-text("Login")').first();
    this.categoryMenu = page.locator('div._1kidPb, div[class*="nav"]').first();
  }

  // ── Actions ────────────────────────────────────────────────

  async open() {
    await this.navigate('/');
    await this.dismissLoginPopup();
  }

  async searchFor(query: string) {
    await this.fill(this.searchInput, query);
    await this.searchButton.click();
    await this.waitForPageLoad();
  }

  async goToCart() {
    await this.click(this.cartIcon);
    await this.waitForPageLoad();
  }

  async clickLogin() {
    await this.click(this.loginButton);
    await this.waitForPageLoad();
  }

  async hoverCategory(categoryName: string) {
    const categoryLink = this.page.locator(`a:has-text("${categoryName}")`).first();
    await categoryLink.hover();
  }

  async getSuggestions(): Promise<string[]> {
    const suggestionList = this.page.locator('div[class*="suggest"], ul[class*="suggest"]');
    await this.isVisible(suggestionList, 5_000);
    const items = suggestionList.locator('li, div[role="option"]');
    return items.allTextContents();
  }

  // ── Assertions ─────────────────────────────────────────────

  async isLogoVisible(): Promise<boolean> {
    return this.isVisible(this.logo);
  }

  async isSearchInputVisible(): Promise<boolean> {
    return this.isVisible(this.searchInput);
  }
}
