/* tslint:disable */
/* eslint-disable */
import { Issue } from '../models/issue';
import { SimpleUser } from '../models/simple-user';

/**
 * Timeline Cross Referenced Event
 */
export interface TimelineCrossReferencedEvent {
  actor?: SimpleUser;
  created_at: string;
  event: string;
  source: {
'type'?: string;
'issue'?: Issue;
};
  updated_at: string;
}
