// Const
import {App, initializeApp} from 'firebase-admin/app';
import {Firestore, getFirestore} from 'firebase-admin/firestore';
import {getStorage, Storage} from 'firebase-admin/storage';
import {getAuth, Auth} from 'firebase-admin/auth';

export const BATCH_MAX = 500;
// HTTP
export const CACHE_MAX_AGE = 60 * 60;// sec * min
export const CACHE_SHARE_MAX_AGE = 60 * 60;// sec * min
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
