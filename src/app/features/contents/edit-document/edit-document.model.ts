export interface SchemaPathItem {
  contentId: string;
  fieldName: string;
  schemaName: string;
}

// Events

// Event emitted by app in IFrame
export interface EventToEditor {
  owner: string;
  id: string;
}

// Event emitted by Editor to app in IFrame
export type EventType = 'input' | 'save' | 'publish' | 'change';
export type EventToApp = { type: EventType } | { type: 'input' | 'change'; data: any };
