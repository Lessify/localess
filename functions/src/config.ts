// Const
import {App, initializeApp} from 'firebase-admin/app';
import {Firestore, getFirestore} from 'firebase-admin/firestore';
import {getStorage, Storage} from 'firebase-admin/storage';
import {Auth, getAuth} from 'firebase-admin/auth';
import {TranslationServiceClient} from '@google-cloud/translate';
import {FIREBASE_CONFIG, FirebaseConfig} from './models/firebase.model';

// BATCH OPERATION
export const BATCH_MAX = 500;
// TIME
export const MINUTE = 60;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
// HTTP
export const CACHE_MAX_AGE = DAY;
export const CACHE_SHARE_MAX_AGE = DAY * 7;
// AUTH ROLE
export const ROLE_ADMIN = 'admin';
export const ROLE_CUSTOM = 'custom';

// Init
export const app: App = initializeApp();
export const firestoreService: Firestore = getFirestore(app);
export const authService: Auth = getAuth(app);
export const storageService: Storage = getStorage(app);
export const bucket = storageService.bucket();
export const translationService = new TranslationServiceClient();

// Translation
export const SUPPORT_LOCALES = new Set([
    'af', 'am', 'ar', 'az', 'be', 'bg', 'bn', 'bs', 'ca', 'ceb', 'ckb', 'co', 'cs', 'cy', 'da', 'de',
    'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fr', 'fy', 'ga', 'gd', 'gl', 'gu', 'ha', 'haw',
    'he', 'hi', 'hmn', 'hr', 'ht', 'hu', 'hy', 'id', 'ig', 'is', 'it', 'iw', 'ja', 'jw', 'ka', 'kk',
    'km', 'kn', 'ko', 'ku', 'ky', 'la', 'lb', 'lo', 'lt', 'lv', 'mai', 'mg', 'mi', 'mk', 'ml', 'mn',
    'mr', 'ms', 'mt', 'my', 'ne', 'nl', 'no', 'ny', 'or', 'pa', 'pl', 'ps', 'pt', 'ro', 'ru', 'rw',
    'sd', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'st', 'su', 'sv', 'sw', 'ta', 'te', 'tg',
    'th', 'tk', 'tl', 'tr', 'tt', 'ug', 'uk', 'ur', 'uz', 'vi', 'xh', 'yi', 'yo', 'zh', 'zh-TW', 'zu',
  ]
);

export const firebaseConfig: FirebaseConfig = JSON.parse(process.env[FIREBASE_CONFIG] || '');
