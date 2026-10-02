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
export type EventToAppType = 'save' | 'publish' | 'unpublish' | 'pong' | 'input' | 'change' | 'enterSchema' | 'hoverSchema' | 'leaveSchema';
export type EventToApp =
  | { type: 'pong' | 'leaveSchema' }
  // documentId is the edited document's id, so a page rendering several documents updates only this one.
  | { type: 'save' | 'publish' | 'unpublish'; documentId: string }
  | { type: 'input' | 'change'; documentId: string; data: any }
  | { type: 'enterSchema'; id: string; schema: string; field?: string; root?: boolean }
  | { type: 'hoverSchema'; id: string; schema: string; field?: string };
