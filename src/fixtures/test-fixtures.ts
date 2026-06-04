import { test as base } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { SearchResultsPage } from '../pages/SearchResultsPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { CartPage } from '../pages/CartPage';
import { LoginPage } from '../pages/LoginPage';

/**
 * Extended Playwright test fixtures that inject ready-made page objects.
 *
 * Usage:
 *   import { test, expect } from '../src/fixtures/test-fixtures';
 *   test('example', async ({ homePage }) => { ... });
 */
type FlipkartFixtures = {
  homePage: HomePage;
  searchResultsPage: SearchResultsPage;
  productDetailPage: ProductDetailPage;
  cartPage: CartPage;
  loginPage: LoginPage;
};

export const test = base.extend<FlipkartFixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  searchResultsPage: async ({ page }, use) => {
    await use(new SearchResultsPage(page));
  },
  productDetailPage: async ({ page }, use) => {
    await use(new ProductDetailPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});

export { expect } from '@playwright/test';
