/* tslint:disable */
/* eslint-disable */
import { InteractionGroup } from '../models/interaction-group';

/**
 * Interaction limit settings.
 */
export interface InteractionLimitResponse {
  expires_at: string;
  limit: InteractionGroup;
  origin: string;
}
