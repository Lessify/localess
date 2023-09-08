import {Timestamp} from 'firebase-admin/firestore';
import {Schema} from './schema.model';
import {Content} from './content.model';

export interface Plugin {
  name: string
  owner: string
  version: string

  configurationFields?: PluginConfigurationField[],
  configuration?: PluginConfiguration
  actions?: PluginActionDefinition[]

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
  // Increase number in case you have changes
  version: number
}

export interface PluginSchemaDefinition extends Omit<Schema, 'createdAt' | 'updatedAt'> {
  id: string
  // Increase number in case you have changes
  version: number
}

export interface PluginActionDefinition {
  id: string,
  name: string,
  icon?: string
}

export interface PluginActionData {
  spaceId: string
}
