/* tslint:disable */
/* eslint-disable */
import { MinimalRepository } from '../models/minimal-repository';
import { SearchResultTextMatches } from '../models/search-result-text-matches';

/**
 * Code Search Result Item
 */
export interface CodeSearchResultItem {
  file_size?: number;
  git_url: string;
  html_url: string;
  language?: null | string;
  last_modified_at?: string;
  line_numbers?: Array<string>;
  name: string;
  path: string;
  repository: MinimalRepository;
  score: number;
  sha: string;
  text_matches?: SearchResultTextMatches;
  url: string;
}
