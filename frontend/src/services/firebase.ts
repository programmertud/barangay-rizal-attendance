import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { enableIndexedDbPersistence, getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration (from Firebase console)
const firebaseConfig = {
  apiKey: "AIzaSyC1JbJ2SZNVoY-OhUzmZ_vI2Zac98tSp9g",
  authDomain: "barangay-management-syst-30c52.firebaseapp.com",
  projectId: "barangay-management-syst-30c52",
  storageBucket: "barangay-management-syst-30c52.appspot.com",
  messagingSenderId: "740066844890",
  appId: "1:740066844890:web:c1d7ab236076b6370a45e3",
  measurementId: "G-7L3TB4YSV2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

enableIndexedDbPersistence(db).catch((err: any) => {
  const code = typeof err?.code === 'string' ? err.code : '';
  if (code === 'failed-precondition') {
    return;
  }
  if (code === 'unimplemented') {
    return;
  }
  console.warn('Firestore persistence error:', err);
});
