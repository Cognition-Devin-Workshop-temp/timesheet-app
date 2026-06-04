import { test, expect } from '../src/fixtures/test-fixtures';
import { searchData, cartData } from '../src/utils/test-data';
import { ProductDetailPage } from '../src/pages/ProductDetailPage';
import { type Page } from '@playwright/test';

test.describe('Flipkart Product Detail Page', () => {
  let productPage: ProductDetailPage;
  let newTab: Page;

  test.beforeEach(async ({ homePage, searchResultsPage, page }) => {
    await homePage.open();
    await homePage.searchFor(searchData.validQueries[0]);
    await searchResultsPage.expectResultsVisible();

    // Product detail may open in a new tab or navigate in-place
    const newPagePromise = page.context().waitForEvent('page', { timeout: 10_000 }).catch(() => null);
    await searchResultsPage.clickProduct(0);
    const openedPage = await newPagePromise;

    if (openedPage) {
      await openedPage.waitForLoadState('domcontentloaded');
      newTab = openedPage;
    } else {
      await page.waitForLoadState('domcontentloaded');
      newTab = page;
    }
    productPage = new ProductDetailPage(newTab);
  });

  test.afterEach(async ({ page }) => {
    // Only close if newTab is a separate page from the original
    if (newTab && newTab !== page && !newTab.isClosed()) {
      await newTab.close();
    }
  });

  test('should display the product title', async () => {
    await productPage.expectTitleVisible();
    const title = await productPage.getTitle();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should display the product price', async () => {
    await productPage.expectPriceVisible();
    const price = await productPage.getPriceAsNumber();
    expect(price).toBeGreaterThan(0);
  });

  test('should show Add to Cart button', async () => {
    await productPage.expectAddToCartEnabled();
  });

  test('should check delivery for a valid pincode', async () => {
    await productPage.checkDelivery(cartData.pincode.valid);
    const visible = await productPage.isVisible(productPage.deliveryEstimate);
    expect(visible).toBeTruthy();
  });

  test('should display product images', async () => {
    const count = await productPage.getImageCount();
    expect(count).toBeGreaterThan(0);
  });
});
