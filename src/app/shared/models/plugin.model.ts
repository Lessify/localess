import {Timestamp} from '@angular/fire/firestore';
import {Schema} from '@shared/models/schema.model';

export interface Plugin {
  id: string
  version: string
  name?: string
  owner?: string

  configurations?: PluginConfiguration[]


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

  schemas?: SchemaConfig[]

  configurations?: PluginConfiguration[]
}

export interface PluginConfiguration {
  name: string
  displayName: string
  required: boolean
  description?: string
}

export interface SchemaConfig extends Omit<Schema, 'createdAt' | 'updatedAt'> {
}

//
