export interface SchemaPathItem {
  contentId: string;
  fieldName: string;
  schemaName: string;
}

// Events

// Event emitted to Visual Editor
export type EventToEditorType = 'selectSchema' | 'hoverSchema' | 'leaveSchema';
export type EventToEditor = { owner: 'LOCALESS'; type: EventToEditorType; id: string };

// Event emitted by Visual Editor
export type EventToAppType = 'save' | 'publish' | 'input' | 'change' | 'enterSchema' | 'hoverSchema';
export type EventToApp =
  | { type: 'save' | 'publish' }
  | { type: 'input' | 'change'; data: any }
  | { type: 'enterSchema' | 'hoverSchema'; id: string };
