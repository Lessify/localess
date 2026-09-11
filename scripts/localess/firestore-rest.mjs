/**
 * Encoding plain JavaScript for the Firestore REST API.
 *
 * The Admin SDK is not available here - the CLI talks to Google's HTTP APIs through
 * firebase-tools' authenticated client - and the REST API takes typed values rather than
 * plain JSON: every field says what it is. This turns one into the other.
 *
 * Deliberately knows nothing about Localess. It is the encoding layer, not the schema.
 */
import { randomBytes } from 'node:crypto';

/** The 62 characters the Firestore SDKs draw document ids from. */
export const AUTO_ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export const AUTO_ID_LENGTH = 20;

/** The largest multiple of the alphabet length that fits in a byte. See `autoId`. */
const AUTO_ID_CEILING = 248;

/**
 * A document id, generated the way the Firestore client SDKs generate one.
 *
 * Ids are client-side in Firestore, which is what lets a `:commit` create a document at a
 * known path in a single round trip - there is no "allocate an id" call to make first.
 *
 * `random` is injectable so the distribution logic can be tested with known bytes.
 */
export function autoId(random = randomBytes) {
  let id = '';
  while (id.length < AUTO_ID_LENGTH) {
    for (const byte of random(AUTO_ID_LENGTH)) {
      // 256 is not a multiple of 62, so folding every byte with % would make the first six
      // characters of the alphabet measurably more likely. Discarding the top partial block
      // is the rejection sampling the SDKs use.
      if (byte >= AUTO_ID_CEILING) continue;
      id += AUTO_ID_ALPHABET[byte % AUTO_ID_ALPHABET.length];
      if (id.length === AUTO_ID_LENGTH) break;
    }
  }
  return id;
}

/** Encodes one value. Absent and null are the same thing to Firestore. */
export function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  // The REST API takes integers as strings, because a 64-bit integer does not survive JSON.
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'string') return { stringValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  return { mapValue: { fields: toFirestoreFields(value) } };
}

/** Encodes a record into the `fields` map a Firestore document write expects. */
export function toFirestoreFields(record) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, toFirestoreValue(value)]));
}
