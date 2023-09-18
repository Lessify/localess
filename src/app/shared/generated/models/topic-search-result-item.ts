/* tslint:disable */
/* eslint-disable */
import { SearchResultTextMatches } from '../models/search-result-text-matches';

/**
 * Topic Search Result Item
 */
export interface TopicSearchResultItem {
  aliases?: null | Array<{
'topic_relation'?: {
'id'?: number;
'name'?: string;
'topic_id'?: number;
'relation_type'?: string;
};
}>;
  created_at: string;
  created_by: null | string;
  curated: boolean;
  description: null | string;
  display_name: null | string;
  featured: boolean;
  logo_url?: null | string;
  name: string;
  related?: null | Array<{
'topic_relation'?: {
'id'?: number;
'name'?: string;
'topic_id'?: number;
'relation_type'?: string;
};
}>;
  released: null | string;
  repository_count?: null | number;
  score: number;
  short_description: null | string;
  text_matches?: SearchResultTextMatches;
  updated_at: string;
}
