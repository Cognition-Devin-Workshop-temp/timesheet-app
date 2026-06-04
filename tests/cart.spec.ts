import { test, expect } from '../src/fixtures/test-fixtures';
import { searchData } from '../src/utils/test-data';
import { ProductDetailPage } from '../src/pages/ProductDetailPage';
import { CartPage } from '../src/pages/CartPage';

test.describe('Flipkart Cart Functionality', () => {
  test('should show an empty cart message when no items have been added', async ({
    cartPage,
  }) => {
    await cartPage.open();

    const isEmpty = await cartPage.isCartEmpty();
    expect(isEmpty).toBeTruthy();
  });

  test('should navigate to cart page via the cart icon', async ({ homePage }) => {
    await homePage.open();
    await homePage.goToCart();

    await homePage.expectUrlContains('viewcart');
  });

  test('should add an item to cart from product detail page', async ({
    homePage,
    searchResultsPage,
    page,
  }) => {
    // Search for a product
    await homePage.open();
    await homePage.searchFor(searchData.validQueries[0]);
    await searchResultsPage.expectResultsVisible();

    // Open the first product (Flipkart opens it in a new tab)
    const [productTab] = await Promise.all([
      page.context().waitForEvent('page'),
      searchResultsPage.clickProduct(0),
    ]);
    await productTab.waitForLoadState('domcontentloaded');

    // Add the product to cart
    const productPage = new ProductDetailPage(productTab);
    await productPage.expectAddToCartEnabled();
    await productPage.addToCart();

    // After adding to cart, Flipkart typically redirects to the cart page
    // or stays on the product page with a cart confirmation.
    // Verify we can navigate to cart and see at least one item.
    const cartOnProductTab = new CartPage(productTab);
    const cartUrl = productTab.url();

    if (cartUrl.includes('viewcart')) {
      // Already redirected to cart
      await cartOnProductTab.expectCartNotEmpty();
    } else {
      // Navigate to cart manually on the product tab
      await cartOnProductTab.open();
      await cartOnProductTab.expectCartNotEmpty();
    }

    const itemCount = await cartOnProductTab.getCartItemCount();
    expect(itemCount).toBeGreaterThan(0);

    if (!productTab.isClosed()) {
      await productTab.close();
    }
  });
});
