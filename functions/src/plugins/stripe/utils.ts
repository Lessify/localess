import {Stripe} from 'stripe';
import {
  PackageDimensionRecurringContentData,
  PriceContentData,
  PriceCustomUnitAmountContentData,
  PriceRecurringContentData,
  PriceTireContentData,
  ProductContentData,
} from './model';
import {v4} from 'uuid';

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
  };
  if (data.default_price) {
    result.default_price = priceToContentData(data.default_price as Stripe.Price);
  }
  if (data.package_dimensions) {
    result.package_dimensions = packageDimensionsToContentData(data.package_dimensions);
  }
  return result;
}

export function priceToContentData(data: Stripe.Price): PriceContentData {
  const result: PriceContentData = {
    _id: data.id,
    schema: 'stripe-product-price',
    id: data.id,
    active: data.active,
    billing_scheme: data.billing_scheme,
    currency: data.currency,
    // custom_unit_amount
    livemode: data.livemode,
    lookup_key: data.lookup_key,
    nickname: data.nickname,
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
    result.custom_unit_amount = priceCustomUnitAmountToContentData(data.custom_unit_amount)
  }
  if (data.recurring) {
    result.recurring = recurringToContentData(data.recurring);
  }
  if (data.tiers) {
    result.tiers = data.tiers.map((it) => tireToContentData(it));
  }
  return result;
}

export function recurringToContentData(data: Stripe.Price.Recurring): PriceRecurringContentData {
  const result: PriceRecurringContentData = {
    _id: v4(),
    schema: 'stripe-product-price-recurring',
    aggregate_usage: data.aggregate_usage,
    interval: data.interval,
    interval_count: data.interval_count,
    usage_type: data.usage_type,
  };
  return result;
}

export function tireToContentData(data: Stripe.Price.Tier): PriceTireContentData {
  const result: PriceTireContentData = {
    _id: v4(),
    schema: 'stripe-product-price-tier',
    flat_amount: data.flat_amount,
    flat_amount_decimal: data.flat_amount_decimal,
    unit_amount: data.unit_amount,
    unit_amount_decimal: data.unit_amount_decimal,
    up_to: data.up_to,
  };
  return result;
}

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

export function priceCustomUnitAmountToContentData(data: Stripe.Price.CustomUnitAmount): PriceCustomUnitAmountContentData {
  const result: PriceCustomUnitAmountContentData = {
    _id: v4(),
    schema: 'stripe-product-price-custom-unit-amount',
    maximum: data.maximum,
    minimum: data.minimum,
    preset: data.preset,
  };
  return result;
}

export async function generateProductWithPricesData(stripe: Stripe, product: Stripe.Product): Promise<ProductContentData> {
  const productData: ProductContentData = productToContentData(product);
  const prices = await stripe.prices.list({product: product.id, expand: ['data.tiers']}).autoPagingToArray({limit: 100});
  const pricesData: PriceContentData[] = prices.map((price) => priceToContentData(price));
  if (pricesData.length > 0) {
    productData.prices = pricesData;
  }
  return productData;
}
