import { test, expect } from '../src/fixtures/test-fixtures';

test.describe('Flipkart Home Page', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.open();
  });

  test('should load the home page successfully', async ({ homePage }) => {
    await homePage.expectTitleContains('Flipkart');
  });

  test('should display the Flipkart logo', async ({ homePage }) => {
    const visible = await homePage.isLogoVisible();
    expect(visible).toBeTruthy();
  });

  test('should display the search bar', async ({ homePage }) => {
    const visible = await homePage.isSearchInputVisible();
    expect(visible).toBeTruthy();
  });

  test('should navigate to the cart page when clicking cart icon', async ({
    homePage,
  }) => {
    await homePage.goToCart();
    await homePage.expectUrlContains('viewcart');
  });

  test('should have a login button', async ({ homePage }) => {
    const visible = await homePage.isVisible(homePage.loginButton);
    expect(visible).toBeTruthy();
  });
});
