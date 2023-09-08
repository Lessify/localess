import {Timestamp} from '@angular/fire/firestore';
import {Schema} from '@shared/models/schema.model';
import {Content, ContentKind} from '@shared/models/content.model';

export interface Plugin {
  id: string
  name: string
  owner: string
  version: string

  configurationFields?: PluginConfigurationField[],
  configuration?: PluginConfiguration,

  // Action menu that will appear as dropdown
  actions?: PluginActionDefinition[]

  install?: PluginInstallDefinition
  uninstall?: PluginUninstallDefinition

  // it is identified by comparing db and available list
  latestVersion?: string

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PluginDefinition {
  id: string
  name: string
  owner: string
  version: string
  schemaPrefix?: string
  // Configuration Dialog to collect data
  configurationFields?: PluginConfigurationField[],
  // Action menu that will appear as dropdown
  actions?: PluginActionDefinition[]

  install?: PluginInstallDefinition
  uninstall?: PluginUninstallDefinition
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

export interface PluginSchemaDefinition extends Omit<Schema, 'createdAt' | 'updatedAt'> {
  // Increase number in case you have changes
  version: number
}

export interface PluginContentDefinition extends Omit<Content, 'createdAt' | 'updatedAt'> {
  // Increase number in case you have changes
  version: number
}

export interface PluginActionDefinition {
  id: string,
  name: string,
  icon?: string
}
