export interface SchemaPathItem {
  contentId: string;
  fieldName: string;
  schemaName: string;
}

// Events

// Event emitted from Application to Visual Editor
export type EventToEditorType = 'ping' | 'unload' | 'blocks' | 'selectSchema' | 'hoverSchema' | 'leaveSchema';
export type EventToEditor =
  | { owner: 'LOCALESS'; type: 'ping' }
  // The page's top-level block ids (`data-ll-id` not nested in another block).
  | { owner: 'LOCALESS'; type: 'blocks'; ids: string[] }
  // Sent on pagehide: the connected page is reloading or navigating away.
  | { owner: 'LOCALESS'; type: 'unload' }
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
