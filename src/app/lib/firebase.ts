import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, Firestore, enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDxWs52-V4mCQDv9cKY7s5fzzv4ltUUaWc",
  authDomain: "clinicare-57bc2.firebaseapp.com",
  projectId: "clinicare-57bc2",
  storageBucket: "clinicare-57bc2.firebasestorage.app",
  messagingSenderId: "69249805112",
  appId: "1:69249805112:web:f4e7165320b45886ed6fcd",
  measurementId: "G-ZQ2M0V287Q"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// Secondary app for creating users without signing out the admin
let secondaryApp: FirebaseApp;
let secondaryAuth: Auth;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  // Enable persistent login
  setPersistence(auth, browserLocalPersistence)
    .then(() => {
      console.log('✅ Auth persistence enabled');
    })
    .catch((error) => {
      console.warn('Auth persistence error (non-critical):', error);
    });

  // Enable offline persistence with multi-tab support
  enableMultiTabIndexedDbPersistence(db)
    .then(() => {
      console.log('✅ Offline persistence enabled');
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, using single-tab persistence');
        enableIndexedDbPersistence(db).catch(console.error);
      } else if (err.code === 'unimplemented') {
        console.warn('Browser does not support offline persistence');
      } else {
        console.error('Persistence error:', err);
      }
    });

  // Initialize secondary app for user creation
  secondaryApp = initializeApp(firebaseConfig, 'Secondary');
  secondaryAuth = getAuth(secondaryApp);
} else {
  app = getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);

  // Get or create secondary app
  const existingSecondary = getApps().find(a => a.name === 'Secondary');
  if (existingSecondary) {
    secondaryApp = existingSecondary;
    secondaryAuth = getAuth(secondaryApp);
  } else {
    secondaryApp = initializeApp(firebaseConfig, 'Secondary');
    secondaryAuth = getAuth(secondaryApp);
  }
}

export { app, auth, db, secondaryAuth };