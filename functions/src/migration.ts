import express, { NextFunction, Request, Response } from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { firestoreService } from './config';
import { checkMigrationToken, MIGRATION_CONFIG_PATH, MigrationConfig } from './utils/migration-token';

/**
 * Read-only API a self-hosted Localess install calls to import a space (Admin → Spaces → Import from Firebase).
 * Disabled (404) until an admin generates a migration token in Admin → Settings → Migration.
 */
const PAGE_SIZE = 500;

/**
 * Firestore Timestamps (at any depth) → ISO strings; everything else as stored.
 * @param {unknown} value a Firestore value
 * @return {unknown} its JSON form
 */
function plain(value: unknown): unknown {
  if (value && typeof value === 'object') {
    const ts = value as { toDate?: () => Date };
    if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
    if (Array.isArray(value)) return value.map(plain);
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plain(item)]));
  }
  return value;
}

const toJson = (doc: { id: string; data: () => unknown }) => ({ id: doc.id, ...(plain(doc.data()) as object) });

/**
 * Answers 404 while no migration token is configured, 401 for a missing or wrong one.
 * @param {Request} req request
 * @param {Response} res response
 * @param {NextFunction} next next handler
 */
async function auth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const config = (await firestoreService.doc(MIGRATION_CONFIG_PATH).get()).data() as MigrationConfig | undefined;
  const result = checkMigrationToken(req.header('authorization'), config);
  if (result === 'disabled') {
    res.status(404).json({ message: 'Not found' });
    return;
  }
  if (result === 'unauthorized') {
    res.status(401).json({ message: 'Missing or invalid migration token' });
    return;
  }
  next();
}

/**
 * Answers 404 for an unknown space.
 * @param {Request} req request
 * @param {Response} res response
 * @return {Promise<boolean>} whether the space exists
 */
async function requireSpace(req: Request, res: Response): Promise<boolean> {
  const doc = await firestoreService.doc(`spaces/${req.params['spaceId']}`).get();
  if (!doc.exists) res.status(404).json({ message: 'Space not found' });
  return doc.exists;
}

// eslint-disable-next-line new-cap
export const MIGRATION = express.Router();
MIGRATION.use('/api/migration', auth);

MIGRATION.get('/api/migration/spaces', async (_req, res) => {
  const snapshot = await firestoreService.collection('spaces').orderBy('__name__').get();
  res.json(
    snapshot.docs.map(doc => {
      const space = toJson(doc) as { id: string; name?: string; createdAt?: string };
      return { id: space.id, name: space.name, createdAt: space.createdAt };
    })
  );
});

MIGRATION.get('/api/migration/spaces/:spaceId', async (req, res) => {
  const doc = await firestoreService.doc(`spaces/${req.params['spaceId']}`).get();
  if (!doc.exists) {
    res.status(404).json({ message: 'Space not found' });
    return;
  }
  res.json(toJson({ id: doc.id, data: () => doc.data() }));
});

for (const name of ['tokens', 'webhooks', 'schemas']) {
  MIGRATION.get(`/api/migration/spaces/:spaceId/${name}`, async (req, res) => {
    if (!(await requireSpace(req, res))) return;
    const snapshot = await firestoreService.collection(`spaces/${req.params['spaceId']}/${name}`).orderBy('__name__').get();
    res.json(snapshot.docs.map(toJson));
  });
}

for (const name of ['translations', 'assets', 'contents']) {
  MIGRATION.get(`/api/migration/spaces/:spaceId/${name}`, async (req, res) => {
    if (!(await requireSpace(req, res))) return;
    let query = firestoreService.collection(`spaces/${req.params['spaceId']}/${name}`).orderBy('__name__');
    const cursor = typeof req.query['cursor'] === 'string' ? req.query['cursor'] : undefined;
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.limit(PAGE_SIZE).get();
    const items = snapshot.docs.map(toJson);
    res.json({ items, cursor: items.length === PAGE_SIZE ? items[items.length - 1].id : null });
  });
}

const app = express();
app.use(MIGRATION);

export const migrationapi = onRequest({ memory: '512MiB', maxInstances: 2 }, app);
