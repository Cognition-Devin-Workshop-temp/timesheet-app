import { test, expect } from '@playwright/test';
import { LoginPage } from '../src/pages/LoginPage';
import { InventoryPage } from '../src/pages/InventoryPage';
import { CartPage } from '../src/pages/CartPage';
import { CheckoutPage } from '../src/pages/CheckoutPage';
import { ExcelReader } from '../src/utils/ExcelReader';

const excelReader = new ExcelReader('testdata.xlsx');

test.describe('Checkout Tests - Data Driven from Excel', () => {
  let loginPage: LoginPage;
  let inventoryPage: InventoryPage;
  let cartPage: CartPage;
  let checkoutPage: CheckoutPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    inventoryPage = new InventoryPage(page);
    cartPage = new CartPage(page);
    checkoutPage = new CheckoutPage(page);

    // Login and add a product before checkout tests
    await loginPage.navigate();
    const loginData = await excelReader.getFilteredData('LoginData', 'expectedResult', 'success');
    await loginPage.login(
      loginData[0].username as string,
      loginData[0].password as string
    );

    const products = await excelReader.getFilteredData('ProductData', 'action', 'add');
    await inventoryPage.addItemToCartByName(products[0].productName as string);
    await inventoryPage.goToCart();
    await cartPage.proceedToCheckout();
  });

  test('should complete checkout with valid info', async () => {
    const checkoutData = await excelReader.getFilteredData('CheckoutData', 'expectedResult', 'success');
    const data = checkoutData[0];

    await checkoutPage.fillShippingInfo(
      data.firstName as string,
      data.lastName as string,
      data.postalCode as string
    );
    await checkoutPage.clickContinue();
    await checkoutPage.clickFinish();

    const message = await checkoutPage.getOrderCompleteMessage();
    expect(message).toContain('Thank you for your order');
  });

  test('should show error when first name is missing', async () => {
    const checkoutData = await excelReader.getFilteredData('CheckoutData', 'expectedResult', 'firstname_required');
    const data = checkoutData[0];

    await checkoutPage.fillShippingInfo(
      data.firstName as string,
      data.lastName as string,
      data.postalCode as string
    );
    await checkoutPage.clickContinue();

    const error = await checkoutPage.getErrorMessage();
    expect(error).toContain('First Name is required');
  });

  test('should show error when last name is missing', async () => {
    const checkoutData = await excelReader.getFilteredData('CheckoutData', 'expectedResult', 'lastname_required');
    const data = checkoutData[0];

    await checkoutPage.fillShippingInfo(
      data.firstName as string,
      data.lastName as string,
      data.postalCode as string
    );
    await checkoutPage.clickContinue();

    const error = await checkoutPage.getErrorMessage();
    expect(error).toContain('Last Name is required');
  });

  test('should show error when postal code is missing', async () => {
    const checkoutData = await excelReader.getFilteredData('CheckoutData', 'expectedResult', 'postalcode_required');
    const data = checkoutData[0];

    await checkoutPage.fillShippingInfo(
      data.firstName as string,
      data.lastName as string,
      data.postalCode as string
    );
    await checkoutPage.clickContinue();

    const error = await checkoutPage.getErrorMessage();
    expect(error).toContain('Postal Code is required');
  });
});
