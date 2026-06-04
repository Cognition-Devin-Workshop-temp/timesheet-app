import { test, expect } from '../src/fixtures/test-fixtures';

test.describe('Flipkart Login Page', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test('should display the login form', async ({ loginPage }) => {
    await loginPage.expectLoginFormVisible();
  });

  test('should show error for invalid credentials', async ({ loginPage }) => {
    await loginPage.enterPhoneOrEmail('0000000000');
    await loginPage.submitLogin();

    // Flipkart should show an error or OTP screen
    const hasError = await loginPage.isVisible(loginPage.errorMessage, 5_000);
    const hasOtp = await loginPage.isVisible(loginPage.otpInput, 5_000);
    expect(hasError || hasOtp).toBeTruthy();
  });

  test('should have a link to create a new account', async ({ loginPage }) => {
    const visible = await loginPage.isVisible(loginPage.signupLink);
    expect(visible).toBeTruthy();
  });

  test('should have a forgot-password option', async ({ loginPage }) => {
    const visible = await loginPage.isVisible(loginPage.forgotPasswordLink);
    expect(visible).toBeTruthy();
  });
});
