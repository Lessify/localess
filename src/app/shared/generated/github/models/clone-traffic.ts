/* tslint:disable */
/* eslint-disable */
import { Traffic } from '../models/traffic';

/**
 * Clone Traffic
 */
export interface CloneTraffic {
  clones: Array<Traffic>;
  count: number;
  uniques: number;
}
