import {Timestamp} from '@angular/fire/firestore';
import {Schema} from '@shared/models/schema.model';
import {ContentKind} from '@shared/models/content.model';

export interface Plugin {
  id: string
  version: string
  name?: string
  owner?: string

  configurationFields?: PluginConfigurationField[]
  configuration?: PluginConfiguration

  contents?: PluginContentDefinition[]
  schemas?: SchemaConfig[]

  // it is identified by comparing db and available list
  status?: PluginStatus

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export enum PluginStatus {
  INSTALLED = 'INSTALLED',
  UNKNOWN = 'UNKNOWN'
}

export interface PluginDefinition {
  id: string
  name: string
  owner: string
  version: string
  schemaPrefix?: string
  contents?: PluginContentDefinition[]

  schemas?: SchemaConfig[]

  configurationFields?: PluginConfigurationField[]
}

export interface PluginConfigurationField {
  name: string
  displayName: string
  required: boolean
  description?: string
}

export type PluginConfiguration = Record<string, string>

export interface PluginContentDefinition {
  id: string,
  kind: ContentKind,
  name: string,
  //Slug
  slug: string
  parentSlug: string
  fullSlug: string,
}

export interface SchemaConfig extends Omit<Schema, 'createdAt' | 'updatedAt'> {
}

//
