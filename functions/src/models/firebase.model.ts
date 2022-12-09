export const FIREBASE_CONFIG = 'FIREBASE_CONFIG';

export interface FirebaseConfig {
  projectId: string;
  storageBucket: string;
  locationId?: string;
}
