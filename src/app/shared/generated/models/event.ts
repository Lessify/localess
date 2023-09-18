/* tslint:disable */
/* eslint-disable */
import { Actor } from '../models/actor';
import { Issue } from '../models/issue';
import { IssueComment } from '../models/issue-comment';

/**
 * Event
 */
export interface Event {
  actor: Actor;
  created_at: null | string;
  id: string;
  org?: Actor;
  payload: {
'action'?: string;
'issue'?: Issue;
'comment'?: IssueComment;
'pages'?: Array<{
'page_name'?: string;
'title'?: string;
'summary'?: string | null;
'action'?: string;
'sha'?: string;
'html_url'?: string;
}>;
};
  public: boolean;
  repo: {
'id': number;
'name': string;
'url': string;
};
  type: null | string;
}
