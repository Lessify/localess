/* tslint:disable */
/* eslint-disable */
import { NullableSimpleUser } from '../models/nullable-simple-user';

/**
 * Project Collaborator Permission
 */
export interface ProjectCollaboratorPermission {
  permission: string;
  user: null | NullableSimpleUser;
}
