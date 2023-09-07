import {Timestamp} from 'firebase-admin/firestore';
import {Schema} from './schema.model';
import {Content} from './content.model';

export interface Plugin {
  version: string
  name: string
  owner: string

  configurationFields?: PluginConfigurationField[],
  configuration?: PluginConfiguration

  install?: PluginInstallDefinition
  uninstall?: PluginUninstallDefinition

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PluginConfigurationField {
  name: string
  displayName: string
  required: boolean
  description?: string
}

export type PluginConfiguration = Record<string, string>



export interface PluginInstallDefinition {
  // Content to be created when it is installed
  contents?: PluginContentDefinition[]
  // Schema to be created when it is installed
  schemas?: PluginSchemaDefinition[]
}

export interface PluginUninstallDefinition {
  // Keep history of all content root ID's you have ever created and needs to be deleted
  contentRootIds?: string[]
  // Keep history of all schema ID's you have ever created and needs to be deleted
  schemasIds?: string[]
}

export interface PluginContentDefinition extends Omit<Content, 'createdAt' | 'updatedAt'>{
  id: string,
}

export interface PluginSchemaDefinition extends Omit<Schema, 'createdAt' | 'updatedAt'> {
  id: string
}

//
