/* tslint:disable */
/* eslint-disable */
import { SearchResultTextMatches } from '../models/search-result-text-matches';

/**
 * Label Search Result Item
 */
export interface LabelSearchResultItem {
  color: string;
  default: boolean;
  description: null | string;
  id: number;
  name: string;
  node_id: string;
  score: number;
  text_matches?: SearchResultTextMatches;
  url: string;
}
