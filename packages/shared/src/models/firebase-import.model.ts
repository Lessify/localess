/** Admin → Spaces → Import from Firebase: one run imports one space of a Firebase environment, stage by stage. */
export const FIREBASE_IMPORT_STATUSES = ['RUNNING', 'FINISHED', 'FAILED'] as const;
export type FirebaseImportStatus = (typeof FIREBASE_IMPORT_STATUSES)[number];
export type FirebaseImportStageName =
  | 'space' | 'locales' | 'environments' | 'webhooks'
  | 'translations' | 'schemas' | 'assets' | 'contents' | 'contentMigration';
export const FIREBASE_IMPORT_STAGES: readonly FirebaseImportStageName[] = [
  'space', 'locales', 'environments', 'webhooks', 'translations', 'schemas', 'assets', 'contents', 'contentMigration',
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
