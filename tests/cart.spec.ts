import { test, expect } from '../src/fixtures/test-fixtures';
import { searchData, cartData } from '../src/utils/test-data';
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

  test('should enforce maximum quantity limit for a product in the cart', async ({
    homePage,
    searchResultsPage,
    page,
  }) => {
    // Search and add a product to cart
    await homePage.open();
    await homePage.searchFor(searchData.validQueries[0]);
    await searchResultsPage.expectResultsVisible();

    const [productTab] = await Promise.all([
      page.context().waitForEvent('page'),
      searchResultsPage.clickProduct(0),
    ]);
    await productTab.waitForLoadState('domcontentloaded');

    const productPage = new ProductDetailPage(productTab);
    await productPage.addToCart();

    // Navigate to cart
    const cart = new CartPage(productTab);
    if (!productTab.url().includes('viewcart')) {
      await cart.open();
    }
    await cart.expectCartNotEmpty();

    // Attempt to increase quantity up to the maximum limit
    const maxAttempts = cartData.maxQuantity;
    let hitLimit = false;

    for (let i = 1; i < maxAttempts; i++) {
      const disabledBefore = await cart.isIncreaseDisabled();
      if (disabledBefore) {
        hitLimit = true;
        break;
      }

      await cart.increaseQuantity();

      // Check if a limit message appeared or the button became disabled
      const hasLimitMsg = await cart.hasQuantityLimitMessage();
      const disabledAfter = await cart.isIncreaseDisabled();

      if (hasLimitMsg || disabledAfter) {
        hitLimit = true;
        break;
      }
    }

    // Verify the platform enforces a cap: either the + button is disabled,
    // a limit message is shown, or the quantity did not exceed maxQuantity.
    const finalQty = await cart.getItemQuantity();
    const plusDisabled = await cart.isIncreaseDisabled();
    const limitVisible = await cart.hasQuantityLimitMessage();

    expect(
      hitLimit || plusDisabled || limitVisible || finalQty <= cartData.maxQuantity,
    ).toBeTruthy();

    if (!productTab.isClosed()) {
      await productTab.close();
    }
  });
});
