import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for the Sauce Demo shopping cart page.
 */
export class CartPage extends BasePage {
  private readonly title: Locator;
  private readonly cartItems: Locator;
  private readonly checkoutButton: Locator;
  private readonly continueShoppingButton: Locator;

  constructor(page: Page) {
    super(page);
    this.title = page.locator('.title');
    this.cartItems = page.locator('.cart_item');
    this.checkoutButton = page.locator('[data-test="checkout"]');
    this.continueShoppingButton = page.locator('[data-test="continue-shopping"]');
  }

  async navigate(): Promise<void> {
    await this.page.goto('/cart.html');
    await this.waitForPageLoad();
  }

  async getPageTitle(): Promise<string> {
    return this.getText(this.title);
  }

  async getCartItemCount(): Promise<number> {
    return this.cartItems.count();
  }

  async getCartItemNames(): Promise<string[]> {
    const names = this.page.locator('.cart_item .inventory_item_name');
    return names.allTextContents();
  }

  async removeItem(itemName: string): Promise<void> {
    const item = this.cartItems.filter({ hasText: itemName });
    const removeButton = item.locator('button:has-text("Remove")');
    await this.click(removeButton);
  }

  async proceedToCheckout(): Promise<void> {
    await this.click(this.checkoutButton);
  }

  async continueShopping(): Promise<void> {
    await this.click(this.continueShoppingButton);
  }
}
