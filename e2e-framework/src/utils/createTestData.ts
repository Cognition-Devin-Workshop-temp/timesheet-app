/**
 * Utility script to generate the test data Excel file.
 * Run: npx ts-node src/utils/createTestData.ts
 */
import * as ExcelJS from 'exceljs';
import * as path from 'path';

async function createTestData(): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Login credentials
  const loginSheet = workbook.addWorksheet('LoginData');
  loginSheet.columns = [
    { header: 'username', key: 'username', width: 25 },
    { header: 'password', key: 'password', width: 20 },
    { header: 'expectedResult', key: 'expectedResult', width: 20 },
    { header: 'description', key: 'description', width: 40 },
  ];
  loginSheet.addRows([
    { username: 'standard_user', password: 'secret_sauce', expectedResult: 'success', description: 'Valid standard user login' },
    { username: 'locked_out_user', password: 'secret_sauce', expectedResult: 'locked_out', description: 'Locked out user login' },
    { username: 'invalid_user', password: 'wrong_password', expectedResult: 'invalid', description: 'Invalid credentials login' },
    { username: '', password: 'secret_sauce', expectedResult: 'username_required', description: 'Empty username login' },
    { username: 'standard_user', password: '', expectedResult: 'password_required', description: 'Empty password login' },
  ]);

  // Sheet 2: Products to add to cart
  const productsSheet = workbook.addWorksheet('ProductData');
  productsSheet.columns = [
    { header: 'productName', key: 'productName', width: 30 },
    { header: 'action', key: 'action', width: 15 },
  ];
  productsSheet.addRows([
    { productName: 'Sauce Labs Backpack', action: 'add' },
    { productName: 'Sauce Labs Bike Light', action: 'add' },
    { productName: 'Sauce Labs Bolt T-Shirt', action: 'add' },
  ]);

  // Sheet 3: Checkout information
  const checkoutSheet = workbook.addWorksheet('CheckoutData');
  checkoutSheet.columns = [
    { header: 'firstName', key: 'firstName', width: 20 },
    { header: 'lastName', key: 'lastName', width: 20 },
    { header: 'postalCode', key: 'postalCode', width: 15 },
    { header: 'expectedResult', key: 'expectedResult', width: 20 },
    { header: 'description', key: 'description', width: 40 },
  ];
  checkoutSheet.addRows([
    { firstName: 'John', lastName: 'Doe', postalCode: '12345', expectedResult: 'success', description: 'Valid checkout info' },
    { firstName: '', lastName: 'Doe', postalCode: '12345', expectedResult: 'firstname_required', description: 'Missing first name' },
    { firstName: 'John', lastName: '', postalCode: '12345', expectedResult: 'lastname_required', description: 'Missing last name' },
    { firstName: 'John', lastName: 'Doe', postalCode: '', expectedResult: 'postalcode_required', description: 'Missing postal code' },
  ]);

  const outputPath = path.resolve(process.cwd(), 'testdata', 'testdata.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Test data file created at: ${outputPath}`);
}

createTestData().catch(console.error);
