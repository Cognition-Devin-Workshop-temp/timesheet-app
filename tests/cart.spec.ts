import { test, expect } from '../src/fixtures/test-fixtures';

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
});
