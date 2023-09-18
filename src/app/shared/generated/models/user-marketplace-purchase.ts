/* tslint:disable */
/* eslint-disable */
import { MarketplaceAccount } from '../models/marketplace-account';
import { MarketplaceListingPlan } from '../models/marketplace-listing-plan';

/**
 * User Marketplace Purchase
 */
export interface UserMarketplacePurchase {
  account: MarketplaceAccount;
  billing_cycle: string;
  free_trial_ends_on: null | string;
  next_billing_date: null | string;
  on_free_trial: boolean;
  plan: MarketplaceListingPlan;
  unit_count: null | number;
  updated_at: null | string;
}
