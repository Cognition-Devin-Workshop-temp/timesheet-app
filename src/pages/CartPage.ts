import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for the Flipkart cart / viewcart page.
 */
export class CartPage extends BasePage {
  readonly cartItems: Locator;
  readonly cartItemNames: Locator;
  readonly cartItemPrices: Locator;
  readonly removeButtons: Locator;
  readonly quantitySelectors: Locator;
  readonly emptyCartMessage: Locator;
  readonly totalAmount: Locator;
  readonly placeOrderButton: Locator;
  readonly cartCount: Locator;

  constructor(page: Page) {
    super(page);

    this.cartItems = page.locator('div._1AtVbE, div.CUrjHP');
    this.cartItemNames = page.locator('a._2Kn22P, div._36ESk6');
    this.cartItemPrices = page.locator('span._2-ut7f, span.B_NuCI, div._30jeq3');
    this.removeButtons = page.locator('div._3dsJAO:has-text("Remove"), button:has-text("Remove")');
    this.quantitySelectors = page.locator('div._3dIHCP, div[class*="quantity"]');
    this.emptyCartMessage = page.locator('div._1LsG3E, div:has-text("Your cart is empty")').first();
    this.totalAmount = page.locator('div._2PdFnJ span, span.a-size-medium').first();
    this.placeOrderButton = page.locator('button:has-text("Place Order"), button:has-text("PLACE ORDER")').first();
    this.cartCount = page.locator('span._2MHqjz, span[class*="cart-count"]').first();
  }

  // ── Actions ────────────────────────────────────────────────

  async open() {
    await this.navigate('/viewcart');
    await this.waitForPageLoad();
  }

  async getCartItemCount(): Promise<number> {
    return this.cartItems.count();
  }

  async getCartItemNames(): Promise<string[]> {
    return this.cartItemNames.allTextContents();
  }

  async removeItem(index = 0) {
    const btn = this.removeButtons.nth(index);
    await this.click(btn);
    // Confirm removal if a dialog appears
    const confirmBtn = this.page.locator('div._3dsJAO:has-text("Remove"), button:has-text("Remove")').last();
    if (await this.isVisible(confirmBtn, 3_000)) {
      await confirmBtn.click();
    }
    await this.waitForPageLoad();
  }

  async increaseQuantity(index = 0) {
    const plusButton = this.quantitySelectors.nth(index).locator('button:has-text("+"), button[class*="plus"]');
    await this.click(plusButton);
    await this.waitForPageLoad();
  }

  async decreaseQuantity(index = 0) {
    const minusButton = this.quantitySelectors.nth(index).locator('button:has-text("–"), button:has-text("-"), button[class*="minus"]');
    await this.click(minusButton);
    await this.waitForPageLoad();
  }

  async isCartEmpty(): Promise<boolean> {
    return this.isVisible(this.emptyCartMessage, 5_000);
  }

  async getTotalAmount(): Promise<string> {
    return this.getText(this.totalAmount);
  }

  // ── Assertions ─────────────────────────────────────────────

  async expectCartNotEmpty() {
    const count = await this.getCartItemCount();
    expect(count).toBeGreaterThan(0);
  }

  async expectCartEmpty() {
    expect(await this.isCartEmpty()).toBeTruthy();
  }
}
