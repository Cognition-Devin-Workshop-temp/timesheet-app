import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for the Flipkart login / authentication flow.
 */
export class LoginPage extends BasePage {
  readonly emailPhoneInput: Locator;
  readonly passwordInput: Locator;
  readonly loginSubmitButton: Locator;
  readonly signupLink: Locator;
  readonly forgotPasswordLink: Locator;
  readonly otpInput: Locator;
  readonly requestOtpButton: Locator;
  readonly loginModal: Locator;
  readonly errorMessage: Locator;
  readonly termsText: Locator;

  constructor(page: Page) {
    super(page);

    this.emailPhoneInput = page.locator('input[class*="_2IX_2-"], input[type="text"]').first();
    this.passwordInput = page.locator('input[type="password"]').first();
    this.loginSubmitButton = page.locator('button[class*="_2KpZ6l"], button:has-text("Login"), button[type="submit"]').first();
    this.signupLink = page.locator('a:has-text("New to Flipkart"), a:has-text("Sign Up")').first();
    this.forgotPasswordLink = page.locator('a:has-text("Forgot"), span:has-text("Forgot")').first();
    this.otpInput = page.locator('input[type="tel"], input[class*="otp"]').first();
    this.requestOtpButton = page.locator('button:has-text("Request OTP"), a:has-text("Request OTP")').first();
    this.loginModal = page.locator('div._1b-eOI, div[class*="login-modal"], div[role="dialog"]').first();
    this.errorMessage = page.locator('span._23kozh, span[class*="error"], div[class*="error"]').first();
    this.termsText = page.locator('p._2OmwVB, div:has-text("Terms of Use")').first();
  }

  // ── Actions ────────────────────────────────────────────────

  async open() {
    await this.navigate('/account/login');
    await this.waitForPageLoad();
  }

  async loginWithCredentials(emailOrPhone: string, password: string) {
    await this.fill(this.emailPhoneInput, emailOrPhone);
    await this.loginSubmitButton.click();
    await this.passwordInput.waitFor({ state: 'visible', timeout: 10_000 });
    await this.fill(this.passwordInput, password);
    await this.loginSubmitButton.click();
    await this.waitForPageLoad();
  }

  async enterPhoneOrEmail(value: string) {
    await this.fill(this.emailPhoneInput, value);
  }

  async submitLogin() {
    await this.click(this.loginSubmitButton);
  }

  async requestOtp() {
    await this.click(this.requestOtpButton);
  }

  async enterOtp(otp: string) {
    await this.fill(this.otpInput, otp);
  }

  async clickSignUp() {
    await this.click(this.signupLink);
    await this.waitForPageLoad();
  }

  async clickForgotPassword() {
    await this.click(this.forgotPasswordLink);
  }

  async getErrorMessage(): Promise<string> {
    return this.getText(this.errorMessage);
  }

  // ── Assertions ─────────────────────────────────────────────

  async expectLoginFormVisible() {
    await expect(this.emailPhoneInput).toBeVisible();
  }

  async expectErrorMessageVisible() {
    await expect(this.errorMessage).toBeVisible();
  }

  async expectLoginModalVisible() {
    await expect(this.loginModal).toBeVisible();
  }
}
