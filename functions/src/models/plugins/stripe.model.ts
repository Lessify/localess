import {ContentData, ContentDocument} from '../content.model';

export interface StripeProductContentDocument extends ContentDocument {
  schema: 'stripe-product'
}

export interface StripeProductContentData extends ContentData {

}
