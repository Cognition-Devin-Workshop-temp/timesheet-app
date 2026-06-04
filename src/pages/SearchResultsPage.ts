import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for Flipkart search results.
 */
export class SearchResultsPage extends BasePage {
  readonly resultItems: Locator;
  readonly resultTitles: Locator;
  readonly sortByRelevance: Locator;
  readonly sortByPopularity: Locator;
  readonly sortByPriceLow: Locator;
  readonly sortByPriceHigh: Locator;
  readonly sortByNewest: Locator;
  readonly filterSidebar: Locator;
  readonly priceLabels: Locator;
  readonly noResultsMessage: Locator;
  readonly paginationNext: Locator;

  constructor(page: Page) {
    super(page);

    // Product cards — use multiple selectors to handle Flipkart's changing class names
    this.resultItems = page.locator('div[data-id], div._1AtVbE, div.cPHDOP, div[data-tkid]');
    this.resultTitles = page.locator('div._4rR01T, a.s1Q9rs, a.wjcEIp, div.KzDlHZ, a[class*="WKTcLC"], a[title][href*="/p/"]');

    // Sort bar
    this.sortByRelevance = page.locator('div:has-text("Relevance")[class*="sort"], a:has-text("Relevance")').first();
    this.sortByPopularity = page.locator('div:has-text("Popularity")[class*="sort"], a:has-text("Popularity")').first();
    this.sortByPriceLow = page.locator('div:has-text("Price -- Low to High"), a:has-text("Price -- Low to High")').first();
    this.sortByPriceHigh = page.locator('div:has-text("Price -- High to Low"), a:has-text("Price -- High to Low")').first();
    this.sortByNewest = page.locator('div:has-text("Newest First"), a:has-text("Newest First")').first();

    // Filters
    this.filterSidebar = page.locator('div._1UDcfZ, div[class*="filter"], aside').first();

    // Prices — multiple selectors to handle changing class names
    this.priceLabels = page.locator('div._30jeq3, div.Nx9bqj, div[class*="hl05eU"] div:first-child');

    // No results
    this.noResultsMessage = page.locator('div:has-text("Sorry, no results found"), div._1OKdi2');

    // Pagination
    this.paginationNext = page.locator('a:has-text("Next"), nav a[class*="next"]').first();
  }

  // ── Actions ────────────────────────────────────────────────

  async getResultCount(): Promise<number> {
    await this.resultItems.first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    return this.resultItems.count();
  }

  async getResultTitles(): Promise<string[]> {
    return this.resultTitles.allTextContents();
  }

  async clickProduct(index = 0): Promise<void> {
    const item = this.resultTitles.nth(index);
    await this.click(item);
  }

  async sortBy(option: 'relevance' | 'popularity' | 'priceLow' | 'priceHigh' | 'newest') {
    const map = {
      relevance: this.sortByRelevance,
      popularity: this.sortByPopularity,
      priceLow: this.sortByPriceLow,
      priceHigh: this.sortByPriceHigh,
      newest: this.sortByNewest,
    };
    await this.click(map[option]);
    await this.waitForPageLoad();
  }

  async applyBrandFilter(brand: string) {
    const brandCheckbox = this.page.locator(`div.XqNaEv:has-text("${brand}"), label:has-text("${brand}")`).first();
    await this.click(brandCheckbox);
    await this.waitForPageLoad();
  }

  async getPrices(): Promise<number[]> {
    const texts = await this.priceLabels.allTextContents();
    return texts
      .map((t) => parseInt(t.replace(/[^\d]/g, ''), 10))
      .filter((n) => !isNaN(n));
  }

  async goToNextPage() {
    await this.click(this.paginationNext);
    await this.waitForPageLoad();
  }

  async hasNoResults(): Promise<boolean> {
    return this.isVisible(this.noResultsMessage, 5_000);
  }

  // ── Assertions ─────────────────────────────────────────────

  async expectResultsVisible() {
    const count = await this.getResultCount();
    expect(count).toBeGreaterThan(0);
  }

  async expectPricesSortedAscending() {
    const prices = await this.getPrices();
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  }

  async expectPricesSortedDescending() {
    const prices = await this.getPrices();
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
    }
  }
}
