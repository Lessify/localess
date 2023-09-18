/* tslint:disable */
/* eslint-disable */

/**
 * Marketplace Listing Plan
 */
export interface MarketplaceListingPlan {
  accounts_url: string;
  bullets: Array<string>;
  description: string;
  has_free_trial: boolean;
  id: number;
  monthly_price_in_cents: number;
  name: string;
  number: number;
  price_model: 'FREE' | 'FLAT_RATE' | 'PER_UNIT';
  state: string;
  unit_name: null | string;
  url: string;
  yearly_price_in_cents: number;
}
