import type { Readable } from 'node:stream';

/** A Firestore document: its id and raw field data (Timestamps still as Firestore Timestamps). */
export interface SourceDocument {
  id: string;
  data: Record<string, unknown>;
}

/** The parts of a Firebase Auth user record the import reads. */
export interface SourceAuthUser {
  uid: string;
  email?: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  disabled: boolean;
  /** base64; present when the credentials may read password hashes. */
  passwordHash?: string;
  passwordSalt?: string;
  providerIds: string[];
  customClaims?: Record<string, unknown>;
  creationTime?: string;
}

/**
 * Read-only access to a Firebase project, as the import needs it. `FirebaseAdminSource` implements
 * it with firebase-admin; tests use an in-memory fake.
 */
export interface FirebaseSource {
  /** Every document of a collection path such as `spaces` or `spaces/{id}/contents`. */
  documents(collectionPath: string): Promise<SourceDocument[]>;
  authUsers(): AsyncIterable<SourceAuthUser>;
  /** Byte size of a Storage object, or undefined when it doesn't exist. */
  fileSize(path: string): Promise<number | undefined>;
  readFile(path: string): Readable;
  close(): Promise<void>;
}

const PAGE = 500;

/** firebase-admin implementation. Credentials come from GOOGLE_APPLICATION_CREDENTIALS (or ADC). */
export class FirebaseAdminSource implements FirebaseSource {
  private constructor(
    private readonly app: import('firebase-admin/app').App,
    private readonly firestore: import('firebase-admin/firestore').Firestore,
    private readonly bucket: ReturnType<import('firebase-admin/storage').Storage['bucket']>,
    private readonly auth: import('firebase-admin/auth').Auth,
  ) {}

  static async connect(projectId: string, bucketName?: string): Promise<FirebaseAdminSource> {
    const { initializeApp } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const { getStorage } = await import('firebase-admin/storage');
    const { getAuth } = await import('firebase-admin/auth');
    const app = initializeApp({ projectId, storageBucket: bucketName ?? `${projectId}.appspot.com` }, `localess-import-${Date.now()}`);
    return new FirebaseAdminSource(app, getFirestore(app), getStorage(app).bucket(), getAuth(app));
  }

  async documents(collectionPath: string): Promise<SourceDocument[]> {
    const { FieldPath } = await import('firebase-admin/firestore');
    const result: SourceDocument[] = [];
    let last: string | undefined;
    // Paged by id so large collections never load in one response.
    for (;;) {
      let query = this.firestore.collection(collectionPath).orderBy(FieldPath.documentId()).limit(PAGE);
      if (last) query = query.startAfter(last);
      const page = await query.get();
      for (const doc of page.docs) result.push({ id: doc.id, data: doc.data() });
      if (page.size < PAGE) return result;
      last = page.docs[page.docs.length - 1].id;
    }
  }

  async *authUsers(): AsyncIterable<SourceAuthUser> {
    let pageToken: string | undefined;
    do {
      const page = await this.auth.listUsers(1000, pageToken);
      for (const user of page.users) {
        yield {
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          displayName: user.displayName,
          photoURL: user.photoURL,
          disabled: user.disabled,
          passwordHash: user.passwordHash,
          passwordSalt: user.passwordSalt,
          providerIds: user.providerData.map(it => it.providerId),
          customClaims: user.customClaims,
          creationTime: user.metadata.creationTime,
        };
      }
      pageToken = page.pageToken;
    } while (pageToken);
  }

  async fileSize(path: string): Promise<number | undefined> {
    try {
      const [metadata] = await this.bucket.file(path).getMetadata();
      return Number(metadata.size);
    } catch {
      return undefined;
    }
  }

  readFile(path: string): Readable {
    return this.bucket.file(path).createReadStream();
  }

  async close(): Promise<void> {
    const { deleteApp } = await import('firebase-admin/app');
    await deleteApp(this.app);
  }
}
