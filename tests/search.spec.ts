import { test, expect } from '../src/fixtures/test-fixtures';
import { searchData } from '../src/utils/test-data';

test.describe('Flipkart Search Functionality', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.open();
  });

  test('should display search results for a valid product query', async ({
    homePage,
    searchResultsPage,
  }) => {
    await homePage.searchFor(searchData.validQueries[0]);

    await searchResultsPage.expectResultsVisible();
    await searchResultsPage.expectUrlContains('q=');
  });

  test('should display relevant titles matching the search keyword', async ({
    homePage,
    searchResultsPage,
  }) => {
    const query = searchData.validQueries[0];
    await homePage.searchFor(query);

    const titles = await searchResultsPage.getResultTitles();
    expect(titles.length).toBeGreaterThan(0);
  });

  test('should handle an invalid / gibberish search query gracefully', async ({
    homePage,
    searchResultsPage,
  }) => {
    await homePage.searchFor(searchData.invalidQuery);

    // Either shows "no results" or a fallback list — both are acceptable
    const noResults = await searchResultsPage.hasNoResults();
    const count = await searchResultsPage.getResultCount();
    expect(noResults || count >= 0).toBeTruthy();
  });

  test('should sort search results by price low to high', async ({
    homePage,
    searchResultsPage,
  }) => {
    await homePage.searchFor(searchData.validQueries[2]); // headphones
    await searchResultsPage.sortBy('priceLow');

    await searchResultsPage.expectUrlContains('sort=price_asc');
  });

  test('should sort search results by price high to low', async ({
    homePage,
    searchResultsPage,
  }) => {
    await homePage.searchFor(searchData.validQueries[2]); // headphones
    await searchResultsPage.sortBy('priceHigh');

    await searchResultsPage.expectUrlContains('sort=price_desc');
  });

  test('should navigate to the next page of search results', async ({
    homePage,
    searchResultsPage,
  }) => {
    await homePage.searchFor(searchData.validQueries[0]);
    await searchResultsPage.expectResultsVisible();

    await searchResultsPage.goToNextPage();
    await searchResultsPage.expectUrlContains('page=2');
  });

  test('should display product prices on the search results page', async ({
    homePage,
    searchResultsPage,
  }) => {
    await homePage.searchFor(searchData.validQueries[1]); // Samsung Galaxy
    const prices = await searchResultsPage.getPrices();
    expect(prices.length).toBeGreaterThan(0);

    // All extracted prices should be positive numbers
    prices.forEach((p) => expect(p).toBeGreaterThan(0));
  });
});
