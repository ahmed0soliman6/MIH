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
  getDoc,
  getDocs,
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

  let settingsEmails: string[] = [];
  let adminsCollEmails: string[] = [];

  const broadcastCombined = () => {
    const combined = Array.from(new Set([...settingsEmails, ...adminsCollEmails])).filter(Boolean);
    if (combined.length > 0) {
      onData(combined);
    }
  };

  let unsubSettings = () => {};
  let unsubAdmins = () => {};

  try {
    const docRef = doc(db, 'settings', 'admin_whitelist');
    unsubSettings = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.emails)) {
            settingsEmails = data.emails.map((e: string) => e.trim().toLowerCase()).filter(Boolean);
            broadcastCombined();
          }
        }
      },
      (err) => {
        console.warn('Settings whitelist subscription notice:', err.message);
      }
    );

    const adminsColl = collection(db, 'admins');
    unsubAdmins = onSnapshot(
      adminsColl,
      (snap) => {
        const found: string[] = [];
        snap.forEach((d) => {
          const data = d.data();
          const em = (data.email || d.id || '').trim().toLowerCase();
          if (em && em.includes('@')) {
            found.push(em);
          }
        });
        adminsCollEmails = found;
        broadcastCombined();
      },
      (err) => {
        console.warn('Admins collection subscription notice:', err.message);
      }
    );
  } catch (e) {
    console.warn('Whitelist subscription setup error:', e);
  }

  return () => {
    unsubSettings();
    unsubAdmins();
  };
}

export async function isEmailAdminInFirestore(db: Firestore | null, email: string): Promise<boolean> {
  if (!db || !email) return false;
  const cleanEmail = email.trim().toLowerCase();
  try {
    // 1. Check direct document in admins collection
    const adminDoc = await getDoc(doc(db, 'admins', cleanEmail));
    if (adminDoc.exists()) {
      return true;
    }

    // 2. Check settings/admin_whitelist
    const settingsDoc = await getDoc(doc(db, 'settings', 'admin_whitelist'));
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      if (Array.isArray(data.emails)) {
        if (data.emails.some((e: string) => typeof e === 'string' && e.trim().toLowerCase() === cleanEmail)) {
          return true;
        }
      }
    }
  } catch (err) {
    console.warn('isEmailAdminInFirestore check error:', err);
  }
  return false;
}

export async function fetchWhitelistFromFirestore(db: Firestore | null): Promise<string[]> {
  if (!db) return [];
  const found = new Set<string>();
  try {
    // 1. Check settings/admin_whitelist
    const docRef = doc(db, 'settings', 'admin_whitelist');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.emails)) {
        data.emails.forEach((e: string) => {
          if (typeof e === 'string' && e.trim()) {
            found.add(e.trim().toLowerCase());
          }
        });
      }
    }

    // 2. Also check admins collection
    try {
      const adminsColl = collection(db, 'admins');
      const adminSnaps = await getDocs(adminsColl);
      adminSnaps.forEach((d) => {
        const data = d.data();
        const em = data.email || d.id;
        if (typeof em === 'string' && em.includes('@')) {
          found.add(em.trim().toLowerCase());
        }
      });
    } catch (e) {
      console.warn('Admins collection fetch notice:', e);
    }
  } catch (err) {
    console.warn('Error fetching whitelist directly from Firestore:', err);
  }
  return Array.from(found);
}

export async function saveWhitelistToFirestore(db: Firestore | null, emails: string[]): Promise<boolean> {
  if (!db) return false;
  const cleanEmails = Array.from(new Set(emails.map((e) => e.trim().toLowerCase()))).filter(Boolean);
  try {
    // 1. Save to settings/admin_whitelist
    await setDoc(doc(db, 'settings', 'admin_whitelist'), {
      emails: cleanEmails,
      updated_at: new Date().toISOString()
    }, { merge: true });

    // 2. Also populate individual admin records in /admins/{email}
    for (const email of cleanEmails) {
      try {
        await setDoc(doc(db, 'admins', email), {
          email: email,
          role: 'admin',
          updated_at: new Date().toISOString()
        }, { merge: true });
      } catch (innerErr) {
        console.warn(`Could not sync admin doc for ${email}:`, innerErr);
      }
    }
    return true;
  } catch (e) {
    console.warn('Failed to save whitelist to Firestore:', e);
    return false;
  }
}

export async function deleteAdminDocFromFirestore(db: Firestore | null, email: string): Promise<void> {
  if (!db || !email) return;
  try {
    const cleanEmail = email.trim().toLowerCase();
    await deleteDoc(doc(db, 'admins', cleanEmail));
  } catch (e) {
    console.warn(`Could not delete admin doc for ${email}:`, e);
  }
}

export async function seedFirestoreWithDefaults(
  db: Firestore | null,
  policies: Policy[],
  authorEmail: string = 'admin@mih-quality.gov.eg'
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!db) return { success: false, count: 0, error: 'قاعدة بيانات Firestore غير متصلة' };
  try {
    const colRef = collection(db, 'policies');
    for (const p of policies) {
      const docRef = doc(colRef, p.id);
      await setDoc(docRef, {
        ...p,
        updated_at: new Date().toISOString(),
        author_email: authorEmail
      }, { merge: true });
    }
    return { success: true, count: policies.length };
  } catch (err: any) {
    console.error('Error seeding Firestore:', err);
    return { success: false, count: 0, error: err.message || String(err) };
  }
}

