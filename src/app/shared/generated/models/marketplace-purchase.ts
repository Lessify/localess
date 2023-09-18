/* tslint:disable */
/* eslint-disable */
import { MarketplaceListingPlan } from '../models/marketplace-listing-plan';

/**
 * Marketplace Purchase
 */
export interface MarketplacePurchase {
  email?: null | string;
  id: number;
  login: string;
  marketplace_pending_change?: null | {
'is_installed'?: boolean;
'effective_date'?: string;
'unit_count'?: number | null;
'id'?: number;
'plan'?: MarketplaceListingPlan;
};
  marketplace_purchase: {
'billing_cycle'?: string;
'next_billing_date'?: string | null;
'is_installed'?: boolean;
'unit_count'?: number | null;
'on_free_trial'?: boolean;
'free_trial_ends_on'?: string | null;
'updated_at'?: string;
'plan'?: MarketplaceListingPlan;
};
  organization_billing_email?: string;
  type: string;
  url: string;
}
