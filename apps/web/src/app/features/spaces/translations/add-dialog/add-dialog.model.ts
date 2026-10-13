export interface AddDialogContext {
  reservedKeys: string[];
}

export interface AddDialogResult {
  key: string;
  value: string;
  labels: string[];
  description: string;
  autoTranslate?: boolean;
}
