export interface UserPermission {
  id: string;
  label: string;
  desc: string;
}

export interface UserPermissionGroup {
  label: string;
  permissions: UserPermission[];
}

export const USER_PERMISSION_GROUPS: UserPermissionGroup[] = [
  {
    label: 'Administration',
    permissions: [
      { id: 'USER_MANAGEMENT', label: 'User Management', desc: 'Invite, Delete users and change roles.' },
      { id: 'SPACE_MANAGEMENT', label: 'Space Management', desc: 'Create, Update and Delete.' },
      { id: 'SETTINGS_MANAGEMENT', label: 'Settings Management', desc: 'Change system settings.' },
    ],
  },
  {
    label: 'Translation',
    permissions: [
      { id: 'TRANSLATION_READ', label: 'Read', desc: 'Read Translation.' },
      { id: 'TRANSLATION_CREATE', label: 'Create', desc: 'Create Translation.' },
      { id: 'TRANSLATION_UPDATE', label: 'Update', desc: 'Update Translation.' },
      { id: 'TRANSLATION_DELETE', label: 'Delete', desc: 'Delete Translation.' },
      { id: 'TRANSLATION_PUBLISH', label: 'Publish', desc: 'Publish Translation.' },
      { id: 'TRANSLATION_EXPORT', label: 'Export', desc: 'Export Translation.' },
      { id: 'TRANSLATION_IMPORT', label: 'Import', desc: 'Import Translation.' },
    ],
  },
  {
    label: 'Schema',
    permissions: [
      { id: 'SCHEMA_READ', label: 'Read', desc: 'Read Schema.' },
      { id: 'SCHEMA_CREATE', label: 'Create', desc: 'Create Schema.' },
      { id: 'SCHEMA_UPDATE', label: 'Update', desc: 'Update Schema.' },
      { id: 'SCHEMA_DELETE', label: 'Delete', desc: 'Delete Schema.' },
      { id: 'SCHEMA_EXPORT', label: 'Export', desc: 'Export Schema.' },
      { id: 'SCHEMA_IMPORT', label: 'Import', desc: 'Import Schema.' },
    ],
  },
  {
    label: 'Content',
    permissions: [
      { id: 'CONTENT_READ', label: 'Read', desc: 'Read Content.' },
      { id: 'CONTENT_CREATE', label: 'Create', desc: 'Create Content.' },
      { id: 'CONTENT_UPDATE', label: 'Update', desc: 'Update Content.' },
      { id: 'CONTENT_DELETE', label: 'Delete', desc: 'Delete Content.' },
      { id: 'CONTENT_PUBLISH', label: 'Publish and Unpublish', desc: 'Publish and Unpublish Content.' },
      { id: 'CONTENT_EXPORT', label: 'Export', desc: 'Export Content.' },
      { id: 'CONTENT_IMPORT', label: 'Import', desc: 'Import Content.' },
    ],
  },
  {
    label: 'Asset',
    permissions: [
      { id: 'ASSET_READ', label: 'Read', desc: 'Read Asset.' },
      { id: 'ASSET_CREATE', label: 'Create', desc: 'Create Asset.' },
      { id: 'ASSET_UPDATE', label: 'Update', desc: 'Update Asset.' },
      { id: 'ASSET_DELETE', label: 'Delete', desc: 'Delete Asset.' },
      { id: 'ASSET_EXPORT', label: 'Export', desc: 'Export Asset.' },
      { id: 'ASSET_REGEN_METADATA', label: 'Regenerate Metadata', desc: 'Regenerate Metadata related to media files.' },
      { id: 'ASSET_IMPORT', label: 'Import', desc: 'Import Asset.' },
    ],
  },
  {
    label: 'Development',
    permissions: [{ id: 'DEV_OPEN_API', label: 'Open API', desc: 'Access to Open API.' }],
  },
];
