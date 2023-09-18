/* tslint:disable */
/* eslint-disable */
import { NullableScopedInstallation } from '../models/nullable-scoped-installation';
import { NullableSimpleUser } from '../models/nullable-simple-user';

/**
 * The authorization for an OAuth app, GitHub App, or a Personal Access Token.
 */
export interface Authorization {
  app: {
'client_id': string;
'name': string;
'url': string;
};
  created_at: string;
  expires_at: null | string;
  fingerprint: null | string;
  hashed_token: null | string;
  id: number;
  installation?: null | NullableScopedInstallation;
  note: null | string;
  note_url: null | string;

  /**
   * A list of scopes that this authorization is in.
   */
  scopes: null | Array<string>;
  token: string;
  token_last_eight: null | string;
  updated_at: string;
  url: string;
  user?: null | NullableSimpleUser;
}
