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
  readonly quantityLimitMessage: Locator;
  readonly quantityInput: Locator;

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
    this.quantityLimitMessage = page.locator('div:has-text("can\'t add more"), div:has-text("maximum order"), div:has-text("limit"), span:has-text("can\'t add more")').first();
    this.quantityInput = page.locator('div._3dIHCP input, div[class*="quantity"] input, input[class*="qty"]').first();
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

  async getItemQuantity(index = 0): Promise<number> {
    const qtyText = await this.quantitySelectors.nth(index).locator('div[class*="value"], input, span').first().inputValue().catch(async () => {
      const text = await this.quantitySelectors.nth(index).textContent() ?? '1';
      const match = text.match(/\d+/);
      return match ? match[0] : '1';
    });
    return parseInt(qtyText, 10) || 1;
  }

  async isIncreaseDisabled(index = 0): Promise<boolean> {
    const plusButton = this.quantitySelectors.nth(index).locator('button:has-text("+"), button[class*="plus"]');
    return plusButton.isDisabled().catch(() => false);
  }

  async hasQuantityLimitMessage(): Promise<boolean> {
    return this.isVisible(this.quantityLimitMessage, 3_000);
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
