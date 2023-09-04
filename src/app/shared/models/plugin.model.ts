import {Timestamp} from "@angular/fire/firestore";

export interface Plugin {
  id: string
  version: string
  name?: string
  owner?: string

  status?: PluginStatus

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export enum PluginStatus {
  AVAILABLE = 'AVAILABLE',
  INSTALLED = 'INSTALLED',
  UNKNOWN = 'UNKNOWN'
}

export interface PluginConfig {
  id: string
  name: string
  owner: string
  version: string
}

//
