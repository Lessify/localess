export interface SchemaPathItem {
  contentId: string;
  fieldName: string;
  schemaName: string;
}

// Events

// Event emitted from Application to Visual Editor
export type EventToEditorType = 'ping' | 'selectSchema' | 'hoverSchema' | 'leaveSchema';
export type EventToEditor =
  | { owner: 'LOCALESS'; type: 'ping' }
  | {
      owner: 'LOCALESS';
      type: 'selectSchema' | 'hoverSchema' | 'leaveSchema';
      id: string;
      schema: string;
      field?: string;
    };

// Event emitted from Visual Editor to Application
export type EventToAppType = 'save' | 'publish' | 'pong' | 'input' | 'change' | 'enterSchema' | 'hoverSchema';
export type EventToApp =
  | { type: 'save' | 'publish' | 'pong' }
  | { type: 'input' | 'change'; data: any }
  | { type: 'enterSchema' | 'hoverSchema'; id: string; schema: string; field?: string };
