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
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Firestore,
  DocumentData,
  QuerySnapshot,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { Policy, AuthUser, SystemSettings, AdminRole, AdminEntry } from '../types';
import { sanitizeHtml } from '../utils/sanitize';

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
  const isConfigured = Boolean(fb && fb.apiKey && fb.apiKey !== 'AIzaSy...' && fb.projectId);

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

    // كاش Firestore الدائم (IndexedDB): يقلل القراءات المدفوعة ويدعم العمل دون اتصال.
    try {
      firestoreInstance = initializeFirestore(appInstance, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      });
    } catch {
      // تمت التهيئة مسبقاً (مثلاً أثناء HMR)
      firestoreInstance = getFirestore(appInstance);
    }

    return { isConfigured: true, app: appInstance, auth: authInstance, db: firestoreInstance };
  } catch (err) {
    console.warn('Firebase initialization error, will use local fallback:', err);
    return { isConfigured: false, app: null, auth: null, db: null };
  }
}

/** رمز هوية المستخدم الحالي (يُستخدم لاستدعاء /api/gemini). */
export async function getCurrentIdToken(): Promise<string | null> {
  try {
    const u = authInstance?.currentUser;
    return u ? await u.getIdToken() : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------
// Policies
// ---------------------------------------------------------------
export function subscribeToPolicies(
  db: Firestore | null,
  onData: (policies: Policy[], meta: { fromCache: boolean }) => void,
  onError?: (err: any) => void
): () => void {
  if (!db) return () => {};

  try {
    const coll = collection(db, 'policies');
    return onSnapshot(
      coll,
      { includeMetadataChanges: false },
      (snapshot: QuerySnapshot<DocumentData>) => {
        const list: Policy[] = [];
        snapshot.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
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
            updated_at:
              data.updated_at && typeof data.updated_at.toDate === 'function'
                ? data.updated_at.toDate().toISOString()
                : data.updated_at || new Date().toISOString(),
            author_email: data.author_email || '',
            updated_by: data.updated_by || '',
            effectiveDate: data.effectiveDate,
            reviewDate: data.reviewDate,
            responsibilities: data.responsibilities,
            notes: data.notes,
            source: data.source
          });
        });
        onData(list, { fromCache: snapshot.metadata.fromCache });
      },
      (err: any) => {
        console.warn('Firestore subscription error:', err);
        if (onError) onError(err);
      }
    );
  } catch (e) {
    console.warn('Failed to setup Firestore listener:', e);
    return () => {};
  }
}

function buildPolicyPayload(policy: Policy, updatedByRaw: string, docId: string): Record<string, any> {
  const updatedBy = updatedByRaw.trim().toLowerCase(); // يجب أن يطابق token.email.lower() في القواعد
  const title = (policy.title || 'سياسة بدون عنوان').trim();
  const code = (policy.code || `POL-${Date.now().toString().slice(-4)}`).trim();
  const category = (policy.category || 'QPI').trim();
  const content_html = sanitizeHtml(policy.content_html && policy.content_html.trim() ? policy.content_html : '<p>محتوى السياسة</p>');
  const plain_text = policy.plain_text && policy.plain_text.trim() ? policy.plain_text : policy.title || 'محتوى السياسة';

  const payload: Record<string, any> = {
    id: docId,
    code: code.length >= 2 ? code : `POL-${code}`,
    title: title.length >= 3 ? title : `${title} - سياسة`,
    category: category.length >= 2 ? category : 'QPI',
    dept: policy.dept || '',
    version: policy.version || 'الإصدار 1.0',
    date: policy.date || '',
    purpose: policy.purpose || '',
    content_html,
    plain_text,
    slides: Array.isArray(policy.slides) ? policy.slides : [],
    updated_at: serverTimestamp(),
    updated_by: updatedBy
  };

  if (policy.effectiveDate) payload.effectiveDate = policy.effectiveDate;
  if (policy.reviewDate) payload.reviewDate = policy.reviewDate;
  if (typeof policy.responsibilities === 'string' && policy.responsibilities) payload.responsibilities = policy.responsibilities;
  if (policy.notes) payload.notes = policy.notes;
  if (policy.source) payload.source = policy.source;
  if (Array.isArray(policy.images)) payload.images = policy.images;
  if (policy.author_email) payload.author_email = policy.author_email;
  return payload;
}

export async function savePolicyToFirestore(db: Firestore | null, policy: Policy, updatedBy: string): Promise<boolean> {
  if (!db) return false;
  const docId = policy.id || `pol-${Date.now()}`;
  const payload = buildPolicyPayload(policy, updatedBy, docId);
  if (!payload.author_email) payload.author_email = updatedBy;
  await setDoc(doc(db, 'policies', docId), payload, { merge: true });
  return true;
}

export async function deletePolicyFromFirestore(db: Firestore | null, policyId: string): Promise<boolean> {
  if (!db) return false;
  await deleteDoc(doc(db, 'policies', policyId));
  return true;
}

async function commitInChunks(
  db: Firestore,
  policies: Policy[],
  updatedBy: string,
  skipIds: Set<string>
): Promise<number> {
  const colRef = collection(db, 'policies');
  const chunkSize = 100;
  let saved = 0;
  const toWrite = policies.filter((p) => !p.id || !skipIds.has(p.id));

  for (let i = 0; i < toWrite.length; i += chunkSize) {
    const chunk = toWrite.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const p of chunk) {
      const docId = p.id || `pol-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const payload = buildPolicyPayload(p, updatedBy, docId);
      if (!payload.author_email) payload.author_email = updatedBy;
      batch.set(doc(colRef, docId), payload, { merge: true });
    }
    await batch.commit();
    saved += chunk.length;
  }
  return saved;
}

function friendlyFirestoreError(err: any): string {
  const msg: string = err?.message || String(err);
  if (msg.includes('permission') || msg.includes('Missing or insufficient permissions')) {
    return 'لا تملك صلاحية الكتابة في Firestore. سجّل الدخول بحساب مدير معتمد (دور editor أو أعلى) وتأكد من نشر قواعد firestore.rules.';
  }
  return msg;
}

/** تهيئة أولية يدوية: تضيف فقط السياسات غير الموجودة ولا تكتب فوق أي سياسة قائمة. */
export async function seedFirestoreWithDefaults(
  db: Firestore | null,
  policies: Policy[],
  updatedBy: string
): Promise<{ success: boolean; count: number; skipped: number; error?: string }> {
  if (!db) return { success: false, count: 0, skipped: 0, error: 'قاعدة بيانات Firestore غير متصلة' };
  try {
    const existing = await getDocs(collection(db, 'policies'));
    const skipIds = new Set<string>();
    existing.forEach((d) => skipIds.add(d.id));
    const count = await commitInChunks(db, policies, updatedBy, skipIds);
    return { success: true, count, skipped: policies.length - count };
  } catch (err: any) {
    console.error('Error seeding policies to Firestore:', err);
    return { success: false, count: 0, skipped: 0, error: friendlyFirestoreError(err) };
  }
}

/** استيراد دفعة سياسات: يكتب (ويحدّث) السياسات المستوردة عمداً. */
export async function upsertPoliciesBatch(
  db: Firestore | null,
  policies: Policy[],
  updatedBy: string
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!db) return { success: false, count: 0, error: 'قاعدة بيانات Firestore غير متصلة' };
  try {
    const count = await commitInChunks(db, policies, updatedBy, new Set());
    return { success: true, count };
  } catch (err: any) {
    console.error('Error importing policies to Firestore:', err);
    return { success: false, count: 0, error: friendlyFirestoreError(err) };
  }
}

// ---------------------------------------------------------------
// Auth
// ---------------------------------------------------------------
export async function loginWithGoogle(auth: Auth | null): Promise<AuthUser | null> {
  if (!auth) return null;
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
  if (auth) await fbSignOut(auth);
}

export function subscribeToAuth(auth: Auth | null, onUserChanged: (user: AuthUser | null) => void): () => void {
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

// ---------------------------------------------------------------
// Admins (المصدر الوحيد للصلاحيات: مجموعة admins في Firestore، وتُفرض بالقواعد)
// ---------------------------------------------------------------
const VALID_ROLES: AdminRole[] = ['editor', 'admin', 'superadmin'];

/** دور المستخدم الحالي (يقرأ مستنده الشخصي فقط). null = ليس مديراً. */
export async function getAdminRole(db: Firestore | null, email: string): Promise<AdminRole | null> {
  if (!db || !email) return null;
  try {
    const snap = await getDoc(doc(db, 'admins', email.trim().toLowerCase()));
    if (!snap.exists()) return null;
    const role = snap.data()?.role as AdminRole;
    return VALID_ROLES.includes(role) ? role : null;
  } catch (err) {
    console.warn('getAdminRole error:', err);
    return null;
  }
}

/** قائمة المديرين (تعمل فقط لدور admin/superadmin وفق القواعد). */
export async function listAdmins(db: Firestore | null): Promise<AdminEntry[]> {
  if (!db) return [];
  try {
    const snaps = await getDocs(collection(db, 'admins'));
    const out: AdminEntry[] = [];
    snaps.forEach((d) => {
      const data = d.data();
      const role = VALID_ROLES.includes(data.role) ? (data.role as AdminRole) : 'editor';
      out.push({ email: (data.email || d.id).toString().toLowerCase(), role, name: data.name || '' });
    });
    return out.sort((a, b) => a.email.localeCompare(b.email));
  } catch (err) {
    console.warn('listAdmins error:', err);
    return [];
  }
}

export async function addAdminDoc(db: Firestore | null, email: string, role: AdminRole, addedBy: string): Promise<void> {
  if (!db) throw new Error('Firestore غير متصل');
  const clean = email.trim().toLowerCase();
  await setDoc(doc(db, 'admins', clean), {
    email: clean,
    role,
    added_at: serverTimestamp(),
    added_by: addedBy.trim().toLowerCase()
  });
}

export async function deleteAdminDoc(db: Firestore | null, email: string): Promise<void> {
  if (!db) throw new Error('Firestore غير متصل');
  await deleteDoc(doc(db, 'admins', email.trim().toLowerCase()));
}

export async function updateAdminRole(db: Firestore | null, email: string, role: AdminRole, updatedBy: string = 'system'): Promise<void> {
  return addAdminDoc(db, email, role, updatedBy);
}

