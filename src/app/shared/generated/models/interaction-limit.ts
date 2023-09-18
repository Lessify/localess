/* tslint:disable */
/* eslint-disable */
import { InteractionExpiry } from '../models/interaction-expiry';
import { InteractionGroup } from '../models/interaction-group';

/**
 * Limit interactions to a specific type of user for a specified duration
 */
export interface InteractionLimit {
  expiry?: InteractionExpiry;
  limit: InteractionGroup;
}
