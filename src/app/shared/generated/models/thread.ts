/* tslint:disable */
/* eslint-disable */
import { MinimalRepository } from '../models/minimal-repository';

/**
 * Thread
 */
export interface Thread {
  id: string;
  last_read_at: null | string;
  reason: string;
  repository: MinimalRepository;
  subject: {
'title': string;
'url': string;
'latest_comment_url': string;
'type': string;
};
  subscription_url: string;
  unread: boolean;
  updated_at: string;
  url: string;
}
