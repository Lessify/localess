import { z } from 'zod';

/** `POST /api/app/admin/firebase-import/spaces`: the Firebase install and its migration token (never stored). */
export const zFirebaseConnection = z.object({ origin: z.string().min(1).max(2048), token: z.string().min(1).max(500) });
export type FirebaseConnection = z.infer<typeof zFirebaseConnection>;

/** `POST /api/app/admin/firebase-import`: the connection and the source space to import. */
export const zFirebaseImportStart = zFirebaseConnection.extend({ spaceId: z.string().min(1).max(128) });
export type FirebaseImportStart = z.infer<typeof zFirebaseImportStart>;
