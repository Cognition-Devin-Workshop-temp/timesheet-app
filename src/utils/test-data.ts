/**
 * Static test data used across Flipkart test scenarios.
 */
export const searchData = {
  validQueries: [
    'iPhone 15',
    'Samsung Galaxy S24',
    'Sony WH-1000XM5',
    'Nike Air Max',
    'Laptop Bag',
  ],
  invalidQuery: 'xyzabc123nonexistent',
  singleCharQuery: 'a',
  specialCharQuery: '@#$%',
};

export const sortOptions = {
  relevance: 'Relevance',
  popularity: 'Popularity',
  priceLowToHigh: 'Price -- Low to High',
  priceHighToLow: 'Price -- High to Low',
  newest: 'Newest First',
} as const;

export const filterCategories = {
  brand: 'Brand',
  price: 'Price',
  customerRatings: 'Customer Ratings',
  offers: 'Offers',
  discount: 'Discount',
  availability: 'Availability',
} as const;

export const productData = {
  /** Known categories for navigation tests */
  categories: [
    'Electronics',
    'TVs & Appliances',
    'Men',
    'Women',
    'Home & Furniture',
  ],
};

export const cartData = {
  maxQuantity: 10,
  pincode: {
    valid: '560001',
    invalid: '000000',
  },
};
