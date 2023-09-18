import {AssetFileType} from '@shared/models/schema.model';

export interface AssetsSelectDialogModel {
  spaceId: string
  multiple?: boolean
  fileType?: AssetFileType
}
