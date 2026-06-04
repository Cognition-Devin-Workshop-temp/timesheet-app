# Playwright E2E Automation Framework

A production-ready End-to-End testing framework built with **Playwright** and **TypeScript**, featuring:

- **Page Object Model (POM)** — Maintainable, reusable page abstractions
- **Excel-Driven Test Data** — Read test data from `.xlsx` files using `exceljs`
- **Multi-Browser Support** — Chromium, Firefox, and WebKit
- **CI-Ready** — GitHub Actions workflow included

## Project Structure

```
├── src/
│   ├── pages/           # Page Object classes
│   │   ├── BasePage.ts        # Abstract base with shared utilities
│   │   ├── LoginPage.ts       # Login page object
│   │   ├── InventoryPage.ts   # Products/inventory page object
│   │   ├── CartPage.ts        # Shopping cart page object
│   │   └── CheckoutPage.ts    # Checkout flow page object
│   └── utils/
│       └── ExcelReader.ts     # Excel data reader utility
├── tests/               # Test spec files
│   ├── login.spec.ts          # Login tests (data-driven)
│   ├── cart.spec.ts           # Shopping cart tests
│   └── checkout.spec.ts       # Checkout flow tests
├── testdata/
│   └── testdata.xlsx          # Excel test data file
├── playwright.config.ts       # Playwright configuration
├── tsconfig.json              # TypeScript configuration
└── package.json
```

## Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x

## Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install --with-deps

# (Optional) Regenerate the test data Excel file
npx ts-node src/utils/createTestData.ts
```

## Running Tests

```bash
# Run all tests (headless)
npm test

# Run tests in headed mode (see the browser)
npm run test:headed

# Run tests with Playwright debugger
npm run test:debug

# Run tests with interactive UI mode
npm run test:ui

# Run specific test file
npx playwright test tests/login.spec.ts

# Run tests on a specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Viewing Reports

```bash
npm run report
```

## Test Data (Excel)

Test data is stored in `testdata/testdata.xlsx` with the following sheets:

| Sheet | Description |
|-------|-------------|
| `LoginData` | Login credentials and expected results |
| `ProductData` | Products to add to cart |
| `CheckoutData` | Checkout form data and validation scenarios |

### Adding New Test Data

1. Open `testdata/testdata.xlsx` in Excel or a compatible editor
2. Add rows to existing sheets or create new sheets
3. In your test, use the `ExcelReader` utility:

```typescript
import { ExcelReader } from '../src/utils/ExcelReader';

const reader = new ExcelReader('testdata.xlsx');
const data = await reader.getSheetData('SheetName');
// or filter: await reader.getFilteredData('SheetName', 'column', 'value');
```

## Page Object Model

All page objects extend `BasePage`, which provides:

- `navigate()` — Navigate to the page
- `waitForPageLoad()` — Wait for network idle
- `click(locator)` — Click with visibility wait
- `fill(locator, text)` — Clear and fill input
- `getText(locator)` — Get element text
- `isVisible(locator)` — Check element visibility
- `takeScreenshot(name)` — Capture page screenshot

### Creating a New Page Object

```typescript
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class MyNewPage extends BasePage {
  private readonly myElement: Locator;

  constructor(page: Page) {
    super(page);
    this.myElement = page.locator('#my-element');
  }

  async navigate(): Promise<void> {
    await this.page.goto('/my-page');
    await this.waitForPageLoad();
  }

  async doSomething(): Promise<void> {
    await this.click(this.myElement);
  }
}
```

## CI/CD

A GitHub Actions workflow is included (`.github/workflows/playwright.yml`) that:
- Installs dependencies and browsers
- Runs all tests on Chromium
- Uploads the HTML report as an artifact

## Configuration

Edit `playwright.config.ts` to:
- Change the `baseURL` for a different target application
- Adjust timeouts, retries, and parallel workers
- Enable/disable browsers
- Configure trace, screenshot, and video recording
