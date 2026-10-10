/** Admin → Spaces → Import from Firebase: one run imports one space of a Firebase environment, stage by stage. */
export type FirebaseImportStatus = 'RUNNING' | 'FINISHED' | 'FAILED';
export type FirebaseImportStageName =
  | 'space' | 'locales' | 'environments' | 'tokens' | 'webhooks'
  | 'translations' | 'schemas' | 'assets' | 'contents' | 'contentMigration';
export const FIREBASE_IMPORT_STAGES: readonly FirebaseImportStageName[] = [
  'space', 'locales', 'environments', 'tokens', 'webhooks', 'translations', 'schemas', 'assets', 'contents', 'contentMigration',
];
export interface FirebaseImportStage {
  stage: FirebaseImportStageName;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';
  count: number;
  total?: number;
  warnings?: string[];
  warningCount?: number;
  error?: string;
}
export interface FirebaseImport {
  id: string;
  origin: string;
  sourceSpaceId: string;
  sourceSpaceName: string;
  spaceId?: string;
  status: FirebaseImportStatus;
  stages: FirebaseImportStage[];
  error?: { stage: FirebaseImportStageName; message: string };
  startedBy: { name: string; email: string };
  startedAt: string;
  finishedAt?: string;
}
/** A space of the Firebase environment, as `POST /admin/firebase-import/spaces` lists it. */
export interface FirebaseSourceSpace {
  id: string;
  name: string;
  createdAt?: string;
  importedAs: { id: string; name: string } | null;
}
