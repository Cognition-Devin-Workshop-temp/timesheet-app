import { test, expect } from '@playwright/test';
import { LoginPage } from '../src/pages/LoginPage';
import { InventoryPage } from '../src/pages/InventoryPage';
import { CartPage } from '../src/pages/CartPage';
import { ExcelReader } from '../src/utils/ExcelReader';

const excelReader = new ExcelReader('testdata.xlsx');

test.describe('Shopping Cart Tests - Data Driven from Excel', () => {
  let loginPage: LoginPage;
  let inventoryPage: InventoryPage;
  let cartPage: CartPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    inventoryPage = new InventoryPage(page);
    cartPage = new CartPage(page);

    // Login before each test
    await loginPage.navigate();
    const loginData = await excelReader.getFilteredData('LoginData', 'expectedResult', 'success');
    await loginPage.login(
      loginData[0].username as string,
      loginData[0].password as string
    );
  });

  test('should add products from Excel to cart', async () => {
    const products = await excelReader.getFilteredData('ProductData', 'action', 'add');

    for (const product of products) {
      await inventoryPage.addItemToCartByName(product.productName as string);
    }

    const cartCount = await inventoryPage.getCartItemCount();
    expect(cartCount).toBe(products.length);
  });

  test('should display added products in cart page', async () => {
    const products = await excelReader.getFilteredData('ProductData', 'action', 'add');

    for (const product of products) {
      await inventoryPage.addItemToCartByName(product.productName as string);
    }

    await inventoryPage.goToCart();
    const cartItems = await cartPage.getCartItemNames();

    for (const product of products) {
      expect(cartItems).toContain(product.productName as string);
    }
  });

  test('should remove item from cart', async () => {
    const products = await excelReader.getFilteredData('ProductData', 'action', 'add');
    const firstProduct = products[0].productName as string;

    await inventoryPage.addItemToCartByName(firstProduct);
    await inventoryPage.goToCart();
    await cartPage.removeItem(firstProduct);

    const cartCount = await cartPage.getCartItemCount();
    expect(cartCount).toBe(0);
  });
});
