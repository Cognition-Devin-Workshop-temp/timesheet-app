import { test, expect } from '../src/fixtures/test-fixtures';
import { searchData, cartData } from '../src/utils/test-data';

test.describe('Flipkart Product Detail Page', () => {
  test.beforeEach(async ({ homePage, searchResultsPage, page }) => {
    await homePage.open();
    await homePage.searchFor(searchData.validQueries[0]);
    await searchResultsPage.expectResultsVisible();

    // Product detail usually opens in a new tab
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      searchResultsPage.clickProduct(0),
    ]);
    await newPage.waitForLoadState('domcontentloaded');
    // Close the original tab and continue on the product page
    await page.close();
    // The test fixture's page is closed; use newPage via productDetailPage
  });

  test('should display the product title', async ({ productDetailPage }) => {
    await productDetailPage.expectTitleVisible();
    const title = await productDetailPage.getTitle();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should display the product price', async ({ productDetailPage }) => {
    await productDetailPage.expectPriceVisible();
    const price = await productDetailPage.getPriceAsNumber();
    expect(price).toBeGreaterThan(0);
  });

  test('should show Add to Cart button', async ({ productDetailPage }) => {
    await productDetailPage.expectAddToCartEnabled();
  });

  test('should check delivery for a valid pincode', async ({ productDetailPage }) => {
    await productDetailPage.checkDelivery(cartData.pincode.valid);
    // Delivery estimate should appear
    const visible = await productDetailPage.isVisible(productDetailPage.deliveryEstimate);
    expect(visible).toBeTruthy();
  });

  test('should display product images', async ({ productDetailPage }) => {
    const count = await productDetailPage.getImageCount();
    expect(count).toBeGreaterThan(0);
  });
});
