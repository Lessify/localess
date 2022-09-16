// Const
import {App, initializeApp} from 'firebase-admin/app';
import {Firestore, getFirestore} from 'firebase-admin/firestore';
import {getStorage, Storage} from 'firebase-admin/storage';
import {getAuth, Auth} from 'firebase-admin/auth';
import {TranslationServiceClient} from '@google-cloud/translate';

// BATCH OPERATION
export const BATCH_MAX = 500;
// TIME
export const MINUTE = 60;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
// HTTP
export const CACHE_MAX_AGE = DAY;
export const CACHE_SHARE_MAX_AGE = DAY;
// AUTH ROLE
export const ROLE_READ = 'read';
export const ROLE_EDIT = 'edit';
export const ROLE_WRITE = 'write';
export const ROLE_ADMIN = 'admin';

// Init
export const app: App = initializeApp();
export const firestoreService: Firestore = getFirestore(app);
export const authService: Auth = getAuth(app);
export const storageService: Storage = getStorage(app);
export const bucket = storageService.bucket();
export const translationService = new TranslationServiceClient()
