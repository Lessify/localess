import { AssetFileType, Schema, SchemaEnumValue, SchemaFieldKind, SchemaType } from '@localess/shared';

// UI-only schema helpers (labels, icons, sorting); the schema model itself is in @localess/shared.

export function sortSchema(a: Schema, b: Schema): number {
  if (a.displayName && b.displayName) {
    return a.displayName.localeCompare(b.displayName);
  } else {
    return a.name.localeCompare(b.name);
  }
}

export function sortSchemaEnumValue(a: SchemaEnumValue, b: SchemaEnumValue): number {
  return a.name.localeCompare(b.name);
}

export interface FieldTypeDescription {
  name: string;
  description: string;
  icon: string;
}

export const schemaTypeDescriptions: Record<SchemaType, FieldTypeDescription> = {
  ROOT: { name: 'Root', icon: 'lucideFileBox', description: 'Root schema, top level schema' },
  NODE: { name: 'Node', icon: 'lucideWorkflow', description: 'Node schema, nested schema' },
  ENUM: { name: 'Enum', icon: 'lucideList', description: 'Enum schema, list of values' },
};

export interface FieldKindDescription {
  name: string;
  description: string;
  icon: string;
}

export const schemaFieldKindDescriptions: Record<SchemaFieldKind, FieldKindDescription> = {
  TEXT: { name: 'Text', icon: 'lucideType', description: 'Short text field, titles or headlines' },
  TEXTAREA: { name: 'Text Area', icon: 'lucideTextInitial', description: 'Long text field, description' },
  RICH_TEXT: {
    name: 'Rich Text',
    icon: 'lucidePencilRuler',
    description: 'Rich text field, text that includes formatting commands for page layout such as bold, underline, italic, etc.',
  },
  MARKDOWN: { name: 'Markdown', icon: 'tablerMarkdown', description: 'Markdown text field, description' },
  NUMBER: { name: 'Number', icon: 'tablerNumber', description: 'Number field, amount or quantity' },
  COLOR: { name: 'Color', icon: 'lucidePalette', description: 'Color field, background or text color' },
  DATE: { name: 'Date', icon: 'lucideCalendar', description: 'Date field, calendar date picker' },
  DATETIME: { name: 'Date and Time', icon: 'lucideClock', description: 'Date and time field, calendar date and time picker' },
  BOOLEAN: { name: 'Boolean', icon: 'lucideToggleLeft', description: 'Boolean field, true or false' },
  OPTION: { name: 'Option (One)', icon: 'lucideList', description: 'Single selection field, dropdown' },
  OPTIONS: { name: 'Options (Multiple)', icon: 'lucideList', description: 'Multiple selection field, dropdown' },
  LINK: { name: 'Link', icon: 'lucideLink', description: 'Link field, external URL or internal resource' },
  REFERENCE: { name: 'Reference (One)', icon: 'lucideFileSymlink', description: 'Reference field, to a internal resource' },
  REFERENCES: { name: 'References (Multiple)', icon: 'lucideFileSymlink', description: 'References field, to multiple internal resources' },
  ASSET: { name: 'Asset (One)', icon: 'lucidePaperclip', description: 'Asset field, image, video or file' },
  ASSETS: { name: 'Assets (Multiple)', icon: 'lucidePaperclip', description: 'Assets field, multiple images, videos or files' },
  SCHEMA: { name: 'Schema (One)', icon: 'lucideToyBrick', description: 'Schema field, to a internal schema' },
  SCHEMAS: { name: 'Schemas (Multiple)', icon: 'lucideToyBrick', description: 'Schemas field, to multiple internal schemas' },
};

export const assetFileTypeDescriptions: Record<AssetFileType, FieldKindDescription> = {
  ANY: { name: 'Any File', icon: 'lucideFile', description: 'All type of files.' },
  IMAGE: {
    name: 'Images',
    icon: 'lucideFileImage',
    description: 'Image or graphical files including both bitmap and vector still images.',
  },
  VIDEO: { name: 'Videos', icon: 'lucideFileVideoCamera', description: 'Videos files.' },
  AUDIO: { name: 'Audio', icon: 'lucideFileMusic', description: 'Audio or music files.' },
  TEXT: {
    name: 'Text Documents',
    icon: 'lucideFileText',
    description: 'Text-only files including any human-readable content, source code, or textual data.',
  },
  APPLICATION: {
    name: 'Application Documents',
    icon: 'lucideFileDigit',
    description: "Any kind of binary data that doesn't fall explicitly into one of the other types.",
  },
};
