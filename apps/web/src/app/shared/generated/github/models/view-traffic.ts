/* tslint:disable */
/* eslint-disable */
import { Traffic } from '../models/traffic';

/**
 * View Traffic
 */
export interface ViewTraffic {
  count: number;
  uniques: number;
  views: Array<Traffic>;
}
