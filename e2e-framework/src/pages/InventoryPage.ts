import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for the Sauce Demo inventory/products page.
 */
export class InventoryPage extends BasePage {
  private readonly title: Locator;
  private readonly inventoryItems: Locator;
  private readonly shoppingCartBadge: Locator;
  private readonly shoppingCartLink: Locator;
  private readonly sortDropdown: Locator;
  private readonly burgerMenuButton: Locator;
  private readonly logoutLink: Locator;

  constructor(page: Page) {
    super(page);
    this.title = page.locator('.title');
    this.inventoryItems = page.locator('.inventory_item');
    this.shoppingCartBadge = page.locator('.shopping_cart_badge');
    this.shoppingCartLink = page.locator('.shopping_cart_link');
    this.sortDropdown = page.locator('[data-test="product-sort-container"]');
    this.burgerMenuButton = page.locator('#react-burger-menu-btn');
    this.logoutLink = page.locator('#logout_sidebar_link');
  }

  async navigate(): Promise<void> {
    await this.page.goto('/inventory.html');
    await this.waitForPageLoad();
  }

  async getPageTitle(): Promise<string> {
    return this.getText(this.title);
  }

  async getInventoryItemCount(): Promise<number> {
    return this.inventoryItems.count();
  }

  async addItemToCartByName(itemName: string): Promise<void> {
    const item = this.page.locator('.inventory_item').filter({ hasText: itemName });
    const addButton = item.locator('button:has-text("Add to cart")');
    await this.click(addButton);
  }

  async removeItemFromCartByName(itemName: string): Promise<void> {
    const item = this.page.locator('.inventory_item').filter({ hasText: itemName });
    const removeButton = item.locator('button:has-text("Remove")');
    await this.click(removeButton);
  }

  async getCartItemCount(): Promise<number> {
    const isVisible = await this.isVisible(this.shoppingCartBadge);
    if (!isVisible) return 0;
    const text = await this.getText(this.shoppingCartBadge);
    return parseInt(text, 10);
  }

  async goToCart(): Promise<void> {
    await this.click(this.shoppingCartLink);
  }

  async sortBy(option: 'az' | 'za' | 'lohi' | 'hilo'): Promise<void> {
    await this.sortDropdown.selectOption(option);
  }

  async getItemNames(): Promise<string[]> {
    const names = this.page.locator('.inventory_item_name');
    return names.allTextContents();
  }

  async getItemPrices(): Promise<number[]> {
    const prices = this.page.locator('.inventory_item_price');
    const texts = await prices.allTextContents();
    return texts.map((t) => parseFloat(t.replace('$', '')));
  }

  async logout(): Promise<void> {
    await this.click(this.burgerMenuButton);
    await this.click(this.logoutLink);
  }
}
