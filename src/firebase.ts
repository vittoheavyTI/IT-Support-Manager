import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const databaseId = (firebaseConfig as any).firestoreDatabaseId || '(default)';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

/** 
 * Use initializeFirestore to force Long Polling transport.
 * This resolves the "ca9" Internal Assertion Failed error common in proxied environments.
 */
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, databaseId);

console.log(`[FIREBASE] App stabilized (v11.1.0) on database: ${databaseId}`);
