import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for the Sauce Demo checkout pages.
 */
export class CheckoutPage extends BasePage {
  private readonly firstNameInput: Locator;
  private readonly lastNameInput: Locator;
  private readonly postalCodeInput: Locator;
  private readonly continueButton: Locator;
  private readonly finishButton: Locator;
  private readonly cancelButton: Locator;
  private readonly errorMessage: Locator;
  private readonly completeHeader: Locator;
  private readonly summaryTotal: Locator;

  constructor(page: Page) {
    super(page);
    this.firstNameInput = page.locator('[data-test="firstName"]');
    this.lastNameInput = page.locator('[data-test="lastName"]');
    this.postalCodeInput = page.locator('[data-test="postalCode"]');
    this.continueButton = page.locator('[data-test="continue"]');
    this.finishButton = page.locator('[data-test="finish"]');
    this.cancelButton = page.locator('[data-test="cancel"]');
    this.errorMessage = page.locator('[data-test="error"]');
    this.completeHeader = page.locator('.complete-header');
    this.summaryTotal = page.locator('.summary_total_label');
  }

  async navigate(): Promise<void> {
    await this.page.goto('/checkout-step-one.html');
    await this.waitForPageLoad();
  }

  async fillShippingInfo(firstName: string, lastName: string, postalCode: string): Promise<void> {
    await this.fill(this.firstNameInput, firstName);
    await this.fill(this.lastNameInput, lastName);
    await this.fill(this.postalCodeInput, postalCode);
  }

  async clickContinue(): Promise<void> {
    await this.click(this.continueButton);
  }

  async clickFinish(): Promise<void> {
    await this.click(this.finishButton);
  }

  async clickCancel(): Promise<void> {
    await this.click(this.cancelButton);
  }

  async getErrorMessage(): Promise<string> {
    return this.getText(this.errorMessage);
  }

  async getOrderCompleteMessage(): Promise<string> {
    return this.getText(this.completeHeader);
  }

  async getSummaryTotal(): Promise<string> {
    return this.getText(this.summaryTotal);
  }
}
