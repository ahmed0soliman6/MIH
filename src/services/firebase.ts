import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  Auth,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  Firestore,
  DocumentData
} from 'firebase/firestore';
import { Policy, AuthUser, SystemSettings } from '../types';

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

export function initFirebaseService(settings: SystemSettings): {
  isConfigured: boolean;
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
} {
  const fb = settings.firebase;
  const isConfigured = Boolean(
    fb && 
    fb.apiKey && 
    fb.apiKey !== 'AIzaSy...' && 
    fb.projectId
  );

  if (!isConfigured) {
    return { isConfigured: false, app: null, auth: null, db: null };
  }

  try {
    if (!getApps().length) {
      appInstance = initializeApp({
        apiKey: fb!.apiKey,
        projectId: fb!.projectId,
        authDomain: fb!.authDomain || `${fb!.projectId}.firebaseapp.com`
      });
    } else {
      appInstance = getApp();
    }

    authInstance = getAuth(appInstance);
    firestoreInstance = getFirestore(appInstance);

    return {
      isConfigured: true,
      app: appInstance,
      auth: authInstance,
      db: firestoreInstance
    };
  } catch (err) {
    console.warn('Firebase initialization error, will use local fallback:', err);
    return { isConfigured: false, app: null, auth: null, db: null };
  }
}

export function subscribeToPolicies(
  db: Firestore | null,
  onData: (policies: Policy[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!db) {
    return () => {};
  }

  try {
    const coll = collection(db, 'policies');
    return onSnapshot(coll, (snapshot) => {
      if (!snapshot.empty) {
        const list: Policy[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as DocumentData;
          list.push({
            id: d.id,
            code: data.code || '',
            title: data.title || '',
            category: data.category || 'QPI',
            dept: data.dept || '',
            version: data.version || 'الإصدار 1.0',
            date: data.date || '',
            purpose: data.purpose || '',
            content_html: data.content_html || '',
            plain_text: data.plain_text || '',
            slides: Array.isArray(data.slides) ? data.slides : [],
            images: Array.isArray(data.images) ? data.images : [],
            updated_at: data.updated_at && typeof data.updated_at.toDate === 'function'
              ? data.updated_at.toDate().toISOString()
              : data.updated_at || new Date().toISOString(),
            author_email: data.author_email || ''
          });
        });
        onData(list);
      }
    }, (err) => {
      console.warn('Firestore subscription error:', err);
      if (onError) onError(err);
    });
  } catch (e) {
    console.warn('Failed to setup Firestore listener:', e);
    return () => {};
  }
}

export async function savePolicyToFirestore(db: Firestore | null, policy: Policy): Promise<boolean> {
  if (!db) return false;
  try {
    const docId = policy.id || `pol-${Date.now()}`;
    const policyToSave = {
      ...policy,
      id: docId,
      updated_at: new Date().toISOString()
    };
    await setDoc(doc(db, 'policies', docId), policyToSave, { merge: true });
    return true;
  } catch (e) {
    console.error('Error saving policy to Firestore:', e);
    throw e;
  }
}

export async function deletePolicyFromFirestore(db: Firestore | null, policyId: string): Promise<boolean> {
  if (!db) return false;
  try {
    await deleteDoc(doc(db, 'policies', policyId));
    return true;
  } catch (e) {
    console.error('Error deleting policy from Firestore:', e);
    throw e;
  }
}

export async function loginWithGoogle(auth: Auth | null): Promise<AuthUser | null> {
  if (!auth) {
    return null;
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return {
    displayName: result.user.displayName,
    email: result.user.email,
    photoURL: result.user.photoURL
  };
}

export async function logoutUser(auth: Auth | null): Promise<void> {
  if (auth) {
    await fbSignOut(auth);
  }
}

export function subscribeToAuth(
  auth: Auth | null,
  onUserChanged: (user: AuthUser | null) => void
): () => void {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
    if (fbUser) {
      onUserChanged({
        displayName: fbUser.displayName,
        email: fbUser.email,
        photoURL: fbUser.photoURL
      });
    } else {
      onUserChanged(null);
    }
  });
}

export function subscribeToWhitelist(
  db: Firestore | null,
  onData: (emails: string[]) => void
): () => void {
  if (!db) return () => {};
  try {
    const docRef = doc(db, 'settings', 'admin_whitelist');
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.emails)) {
          onData(data.emails);
        }
      }
    }, (err) => {
      console.warn('Whitelist subscription notice:', err.message);
    });
  } catch (e) {
    return () => {};
  }
}

export async function saveWhitelistToFirestore(db: Firestore | null, emails: string[]): Promise<boolean> {
  if (!db) return false;
  try {
    await setDoc(doc(db, 'settings', 'admin_whitelist'), {
      emails,
      updated_at: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn('Failed to save whitelist to Firestore:', e);
    return false;
  }
}
