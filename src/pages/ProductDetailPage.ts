import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for the Flipkart product detail page.
 */
export class ProductDetailPage extends BasePage {
  readonly productTitle: Locator;
  readonly productPrice: Locator;
  readonly addToCartButton: Locator;
  readonly buyNowButton: Locator;
  readonly ratingBadge: Locator;
  readonly reviewCount: Locator;
  readonly productImages: Locator;
  readonly deliveryPincodeInput: Locator;
  readonly deliveryCheckButton: Locator;
  readonly deliveryEstimate: Locator;
  readonly sellerName: Locator;
  readonly productDescription: Locator;
  readonly specifications: Locator;
  readonly wishlistButton: Locator;
  readonly shareButton: Locator;

  constructor(page: Page) {
    super(page);

    this.productTitle = page.locator('span.VU-ZEz, h1.yhB1nd, span.B_NuCI').first();
    this.productPrice = page.locator('div.Nx9bqj.CxhGGd, div._30jeq3').first();
    this.addToCartButton = page.locator('button:has-text("Add to Cart"), button:has-text("ADD TO CART")').first();
    this.buyNowButton = page.locator('button:has-text("Buy Now"), button:has-text("BUY NOW")').first();
    this.ratingBadge = page.locator('div.XQDdHH, div._3LWZlK').first();
    this.reviewCount = page.locator('span.Wphh3N, span._2_R_DZ').first();
    this.productImages = page.locator('div._1BweB8 img, div.CXW8mj img, img.q6DClP');
    this.deliveryPincodeInput = page.locator('input[id="pincodeInputId"], input[placeholder*="pincode" i]').first();
    this.deliveryCheckButton = page.locator('span:has-text("Check"), button:has-text("Check")').first();
    this.deliveryEstimate = page.locator('div._1TPvuF, div[class*="delivery"]').first();
    this.sellerName = page.locator('div._1RLviY span, a#sellerName').first();
    this.productDescription = page.locator('div._1mXcCf, div[class*="description"]').first();
    this.specifications = page.locator('div._3k-BhJ, div[class*="specification"]');
    this.wishlistButton = page.locator('div.cPHDOP button[class*="wish"], button:has-text("WISHLIST")').first();
    this.shareButton = page.locator('button:has-text("Share"), div[class*="share"]').first();
  }

  // ── Actions ────────────────────────────────────────────────

  async getTitle(): Promise<string> {
    return this.getText(this.productTitle);
  }

  async getPrice(): Promise<string> {
    return this.getText(this.productPrice);
  }

  async getPriceAsNumber(): Promise<number> {
    const priceText = await this.getPrice();
    return parseInt(priceText.replace(/[^\d]/g, ''), 10);
  }

  async addToCart() {
    await this.click(this.addToCartButton);
    await this.waitForPageLoad();
  }

  async buyNow() {
    await this.click(this.buyNowButton);
    await this.waitForPageLoad();
  }

  async checkDelivery(pincode: string) {
    await this.fill(this.deliveryPincodeInput, pincode);
    await this.click(this.deliveryCheckButton);
  }

  async getRating(): Promise<string> {
    return this.getText(this.ratingBadge);
  }

  async getReviewCount(): Promise<string> {
    return this.getText(this.reviewCount);
  }

  async getSellerName(): Promise<string> {
    return this.getText(this.sellerName);
  }

  async getImageCount(): Promise<number> {
    return this.productImages.count();
  }

  // ── Assertions ─────────────────────────────────────────────

  async expectTitleVisible() {
    await expect(this.productTitle).toBeVisible();
  }

  async expectPriceVisible() {
    await expect(this.productPrice).toBeVisible();
  }

  async expectAddToCartEnabled() {
    await expect(this.addToCartButton).toBeEnabled();
  }
}
