import {ContentData} from '../../models/content.model';
import {Stripe} from 'stripe';

export interface ProductContentData extends ContentData, Omit<Stripe.Product, 'object' | 'created' | 'url' | 'metadata' | 'updated' | 'images' | 'tax_code' | 'default_price' | 'package_dimensions' > {
  schema: 'stripe-product'
  default_price?: PriceContentData | null
  package_dimensions?: PackageDimensionRecurringContentData | null
  prices?: PriceContentData[]
}

export interface PriceContentData extends ContentData, Omit<Stripe.Price, 'object' | 'created' | 'product' | 'metadata' | 'custom_unit_amount'| 'recurring' | 'tiers' | 'transform_quantity'> {
  schema: 'stripe-product-price'
  custom_unit_amount?: PriceCustomUnitAmountContentData | null
  recurring?: PriceRecurringContentData | null
  tiers?: PriceTireContentData[] | null
  // transform_quantity
}

export interface PriceRecurringContentData extends ContentData, Partial<Stripe.Price.Recurring> {
  schema: 'stripe-product-price-recurring'
}

export interface PriceTireContentData extends ContentData, Partial<Stripe.Price.Tier> {
  schema: 'stripe-product-price-tier'
}

export interface PriceCustomUnitAmountContentData extends ContentData, Partial<Stripe.Price.CustomUnitAmount> {
  schema: 'stripe-product-price-custom-unit-amount'
}

export interface PackageDimensionRecurringContentData extends ContentData, Partial<Stripe.Product.PackageDimensions> {
  schema: 'stripe-product-package-dimensions'
}
