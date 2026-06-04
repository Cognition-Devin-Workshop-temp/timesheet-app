import { test, expect } from '@playwright/test';
import { LoginPage } from '../src/pages/LoginPage';
import { InventoryPage } from '../src/pages/InventoryPage';
import { ExcelReader } from '../src/utils/ExcelReader';

const excelReader = new ExcelReader('testdata.xlsx');

test.describe('Login Tests - Data Driven from Excel', () => {
  let loginPage: LoginPage;
  let inventoryPage: InventoryPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    inventoryPage = new InventoryPage(page);
    await loginPage.navigate();
  });

  test('should login successfully with valid credentials', async () => {
    const data = await excelReader.getFilteredData('LoginData', 'expectedResult', 'success');
    const credentials = data[0];

    await loginPage.login(
      credentials.username as string,
      credentials.password as string
    );

    const title = await inventoryPage.getPageTitle();
    expect(title).toBe('Products');
  });

  test('should show error for locked out user', async () => {
    const data = await excelReader.getFilteredData('LoginData', 'expectedResult', 'locked_out');
    const credentials = data[0];

    await loginPage.login(
      credentials.username as string,
      credentials.password as string
    );

    const error = await loginPage.getErrorMessage();
    expect(error).toContain('locked out');
  });

  test('should show error for invalid credentials', async () => {
    const data = await excelReader.getFilteredData('LoginData', 'expectedResult', 'invalid');
    const credentials = data[0];

    await loginPage.login(
      credentials.username as string,
      credentials.password as string
    );

    const error = await loginPage.getErrorMessage();
    expect(error).toContain('Username and password do not match');
  });

  test('should show error when username is empty', async () => {
    const data = await excelReader.getFilteredData('LoginData', 'expectedResult', 'username_required');
    const credentials = data[0];

    await loginPage.login(
      credentials.username as string,
      credentials.password as string
    );

    const error = await loginPage.getErrorMessage();
    expect(error).toContain('Username is required');
  });

  test('should show error when password is empty', async () => {
    const data = await excelReader.getFilteredData('LoginData', 'expectedResult', 'password_required');
    const credentials = data[0];

    await loginPage.login(
      credentials.username as string,
      credentials.password as string
    );

    const error = await loginPage.getErrorMessage();
    expect(error).toContain('Password is required');
  });
});
