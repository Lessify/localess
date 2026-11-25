import { Observable } from 'rxjs';

export interface AddDialogContext {
  /** Whether the space has this key (the server's check). */
  isKeyTaken: (key: string) => Observable<boolean>;
}

export interface AddDialogResult {
  key: string;
  value: string;
  labels: string[];
  description: string;
  autoTranslate?: boolean;
}
