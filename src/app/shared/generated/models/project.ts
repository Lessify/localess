/* tslint:disable */
/* eslint-disable */
import { NullableSimpleUser } from '../models/nullable-simple-user';

/**
 * Projects are a way to organize columns and cards of work.
 */
export interface Project {

  /**
   * Body of the project
   */
  body: null | string;
  columns_url: string;
  created_at: string;
  creator: null | NullableSimpleUser;
  html_url: string;
  id: number;

  /**
   * Name of the project
   */
  name: string;
  node_id: string;
  number: number;

  /**
   * The baseline permission that all organization members have on this project. Only present if owner is an organization.
   */
  organization_permission?: 'read' | 'write' | 'admin' | 'none';
  owner_url: string;

  /**
   * Whether or not this project can be seen by everyone. Only present if owner is an organization.
   */
  private?: boolean;

  /**
   * State of the project; either 'open' or 'closed'
   */
  state: string;
  updated_at: string;
  url: string;
}
