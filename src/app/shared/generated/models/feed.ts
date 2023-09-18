/* tslint:disable */
/* eslint-disable */
import { LinkWithType } from '../models/link-with-type';

/**
 * Feed
 */
export interface Feed {
  '_links': {
'timeline': LinkWithType;
'user': LinkWithType;
'security_advisories'?: LinkWithType;
'current_user'?: LinkWithType;
'current_user_public'?: LinkWithType;
'current_user_actor'?: LinkWithType;
'current_user_organization'?: LinkWithType;
'current_user_organizations'?: Array<LinkWithType>;
'repository_discussions'?: LinkWithType;
'repository_discussions_category'?: LinkWithType;
};
  current_user_actor_url?: string;
  current_user_organization_url?: string;
  current_user_organization_urls?: Array<string>;
  current_user_public_url?: string;
  current_user_url?: string;

  /**
   * A feed of discussions for a given repository and category.
   */
  repository_discussions_category_url?: string;

  /**
   * A feed of discussions for a given repository.
   */
  repository_discussions_url?: string;
  security_advisories_url?: string;
  timeline_url: string;
  user_url: string;
}
