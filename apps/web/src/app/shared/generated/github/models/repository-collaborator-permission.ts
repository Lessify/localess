/* tslint:disable */
/* eslint-disable */
import { NullableCollaborator } from '../models/nullable-collaborator';

/**
 * Repository Collaborator Permission
 */
export interface RepositoryCollaboratorPermission {
  permission: string;
  role_name: string;
  user: NullableCollaborator | null;
}
