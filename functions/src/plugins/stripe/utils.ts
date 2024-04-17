import { Stripe } from 'stripe';
import {
  PackageDimensionRecurringContentData,
  PriceContentData,
  PriceCustomUnitAmountContentData,
  PriceRecurringContentData,
  PriceTireContentData,
  ProductContentData,
} from './model';
import { v4 } from 'uuid';

/**
 * Convert Product to Content Data
 * @param {Stripe.Product} data Stripe Product
 * @return {ProductContentData} content data
 */
export function productToContentData(data: Stripe.Product): ProductContentData {
  const result: ProductContentData = {
    _id: data.id,
    schema: 'stripe-product',
    id: data.id,
    active: data.active,
    // default_price
    description: data.description,
    livemode: data.livemode,
    name: data.name,
    // package_dimensions
    shippable: data.shippable,
    type: data.type,
    unit_label: data.unit_label,
    marketing_features: [],
  };
  if (data.default_price && typeof data.default_price === 'string') {
    result.default_price = {
      kind: 'REFERENCE',
      uri: `stripe-price-${data.default_price}`,
    };
  }
  if (data.package_dimensions) {
    result.package_dimensions = packageDimensionsToContentData(data.package_dimensions);
  }
  return result;
}

/**
 * Convert Price to Content Data
 * @param {Stripe.Price} data Stripe Price
 * @return {PriceContentData} content data
 */
export function priceToContentData(data: Stripe.Price): PriceContentData {
  const result: PriceContentData = {
    _id: data.id,
    schema: 'stripe-price',
    id: data.id,
    active: data.active,
    billing_scheme: data.billing_scheme,
    currency: data.currency,
    // custom_unit_amount
    livemode: data.livemode,
    lookup_key: data.lookup_key,
    nickname: data.nickname,
    product: {
      kind: 'REFERENCE',
      uri: `stripe-product-${data.product}`,
    },
    // recurring
    tax_behavior: data.tax_behavior,
    // tires
    tiers_mode: data.tiers_mode,
    // TODO transform_quantity: data.transform_quantity,
    type: data.type,
    unit_amount: data.unit_amount,
    unit_amount_decimal: data.unit_amount_decimal,
  };
  if (data.custom_unit_amount) {
    result.custom_unit_amount = priceCustomUnitAmountToContentData(data.custom_unit_amount);
  }
  if (data.recurring) {
    result.recurring = recurringToContentData(data.recurring);
  }
  if (data.tiers) {
    result.tiers = data.tiers.map(it => tireToContentData(it));
  }
  return result;
}

/**
 * Convert Price Recurring to Content Data
 * @param {Stripe.Price.Recurring} data Stripe Price Recurring
 * @return {PriceRecurringContentData} content data
 */
export function recurringToContentData(data: Stripe.Price.Recurring): PriceRecurringContentData {
  const result: PriceRecurringContentData = {
    _id: v4(),
    schema: 'stripe-price-recurring',
    aggregate_usage: data.aggregate_usage,
    interval: data.interval,
    interval_count: data.interval_count,
    usage_type: data.usage_type,
  };
  return result;
}

/**
 * Convert Price Tier to Content Data
 * @param {Stripe.Price.Tier} data Stripe Price Tier
 * @return {PriceTireContentData} content data
 */
export function tireToContentData(data: Stripe.Price.Tier): PriceTireContentData {
  const result: PriceTireContentData = {
    _id: v4(),
    schema: 'stripe-price-tier',
    flat_amount: data.flat_amount,
    flat_amount_decimal: data.flat_amount_decimal,
    unit_amount: data.unit_amount,
    unit_amount_decimal: data.unit_amount_decimal,
    up_to: data.up_to,
  };
  return result;
}

/**
 * Convert Price Product PackageDimensions to Content Data
 * @param {Stripe.Product.PackageDimensions} data Stripe Product PackageDimensions
 * @return {PackageDimensionRecurringContentData} content data
 */
export function packageDimensionsToContentData(data: Stripe.Product.PackageDimensions): PackageDimensionRecurringContentData {
  const result: PackageDimensionRecurringContentData = {
    _id: v4(),
    schema: 'stripe-product-package-dimensions',
    height: data.height,
    length: data.length,
    weight: data.weight,
    width: data.width,
  };
  return result;
}

/**
 * Convert Price CustomUnitAmount to Content Data
 * @param {Stripe.Price.CustomUnitAmount} data Stripe Price CustomUnitAmount
 * @return {PriceCustomUnitAmountContentData} content data
 */
export function priceCustomUnitAmountToContentData(data: Stripe.Price.CustomUnitAmount): PriceCustomUnitAmountContentData {
  const result: PriceCustomUnitAmountContentData = {
    _id: v4(),
    schema: 'stripe-price-custom-unit-amount',
    maximum: data.maximum,
    minimum: data.minimum,
    preset: data.preset,
  };
  return result;
}

/**
 * Convert Price CustomUnitAmount to Content Data
 * @param {Stripe} stripe Stripe
 * @param {Stripe.Product} product Stripe Product
 * @return {ProductContentData} content data
 */
export async function generateProductWithPricesData(stripe: Stripe, product: Stripe.Product): Promise<ProductContentData> {
  const productData: ProductContentData = productToContentData(product);
  const prices = await stripe.prices.list({ product: product.id, expand: ['data.tiers'] }).autoPagingToArray({ limit: 100 });
  const pricesData: PriceContentData[] = prices.map(price => priceToContentData(price));
  if (pricesData.length > 0) {
    productData.prices = pricesData;
  }
  return productData;
}
