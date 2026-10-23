import { z } from 'zod';

// App API requests of Admin → Spaces → Import from Firebase.

/** `POST /api/app/admin/firebase-import/spaces`: the Firebase install and its migration token (never stored). */
export const zFirebaseImportConnection = z.strictObject({ origin: z.string().min(1).max(2048), token: z.string().min(1).max(500) });
export type FirebaseImportConnection = z.infer<typeof zFirebaseImportConnection>;

/** `POST /api/app/admin/firebase-import`: the connection and the source space to import. */
export const zFirebaseImportStart = zFirebaseImportConnection.extend({ spaceId: z.string().min(1).max(128) });
export type FirebaseImportStart = z.infer<typeof zFirebaseImportStart>;
