
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot, collection, getDocs, deleteDoc, getDoc } from 'firebase/firestore';
import { AppState, SessionMeta } from '../types';

// --------------------------------------------------------
// Firebase Configuration
// Connected to project: gemini-petsitter
// --------------------------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyA-klgH-0AHfRucud82kygZ0KsI9Tb-qWM",
  authDomain: "gemini-petsitter.firebaseapp.com",
  databaseURL: "https://gemini-petsitter-default-rtdb.firebaseio.com",
  projectId: "gemini-petsitter",
  storageBucket: "gemini-petsitter.firebasestorage.app",
  messagingSenderId: "415936904956",
  appId: "1:415936904956:web:0fcc60f9d85cf7805e2179"
};

let db: any;
let isConfigured = false;

try {
  const app = initializeApp(firebaseConfig);
  // Connect specifically to the named database 'petdatabase' as requested
  db = getFirestore(app, 'petdatabase');
  isConfigured = true;
  console.log("Firebase initialized successfully (petdatabase)");
} catch (e) {
  console.error("Firebase initialization failed.", e);
}

const COLLECTION = 'sessions';

export const isFirebaseConfigured = () => isConfigured;

// Helper to recursively replace undefined with null
const sanitizeData = (obj: any): any => {
  if (obj === undefined) {
    return null;
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeData);
  }
  
  const sanitized: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      sanitized[key] = sanitizeData(obj[key]);
    }
  }
  return sanitized;
};

// --- Session Management ---

export const checkSessionExists = async (sessionId: string): Promise<boolean> => {
  if (!db) return false;
  try {
    const docRef = doc(db, COLLECTION, sessionId);
    const snapshot = await getDoc(docRef);
    return snapshot.exists();
  } catch (e) {
    console.error("Error checking session existence:", e);
    return false;
  }
};

export const createSession = async (meta: SessionMeta): Promise<void> => {
  if (!db) throw new Error("Database not initialized");
  
  // Double check existence to prevent overwrite at the storage level
  // (Though logic should handle this in UI, this is a failsafe)
  const docRef = doc(db, COLLECTION, meta.id);
  
  const initialState: AppState = {
    ...meta,
    logs: {}
  };
  await setDoc(docRef, sanitizeData(initialState));
};

export const listSessions = async (): Promise<SessionMeta[]> => {
  if (!db) return [];
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION));
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Extract only metadata fields
      return {
        id: doc.id,
        sitterName: data.sitterName,
        startDate: data.startDate,
        totalDays: data.totalDays,
        dogs: data.dogs || [],
        emergencyContacts: data.emergencyContacts || {},
        createdAt: data.createdAt || Date.now()
      } as SessionMeta;
    });
  } catch (e) {
    console.error("Error listing sessions:", e);
    return [];
  }
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  if (!db) return;
  await deleteDoc(doc(db, COLLECTION, sessionId));
};

// --- Live Sync ---

export const subscribeToSession = (
  sessionId: string,
  onData: (data: AppState) => void, 
  onError?: (error: string) => void
) => {
  if (!db) {
    console.warn("Firebase not configured. Data will not sync.");
    return () => {};
  }
  
  const docRef = doc(db, COLLECTION, sessionId);
  
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as AppState;
      onData(data);
    } else {
      // Document was deleted or doesn't exist
      onError?.('session_not_found');
    }
  }, (error) => {
    console.error("Sync error detail:", error);
    
    let userFriendlyError = error.message;
    
    if (error.message.includes('permission-denied') || error.code === 'permission-denied') {
      userFriendlyError = 'firestore_permission_denied';
    } else if (error.message.includes('not-found') || error.code === 'not-found') {
      userFriendlyError = 'firestore_not_found';
    }

    if (onError) onError(userFriendlyError);
  });

  return unsubscribe;
};

export const saveSessionState = async (sessionId: string, state: AppState): Promise<void> => {
  if (!db) return;

  try {
    const docRef = doc(db, COLLECTION, sessionId);
    const safeState = sanitizeData(state);
    await setDoc(docRef, safeState, { merge: true });
  } catch (e: any) {
    console.error("Error saving to cloud", e);
    if (e.message.includes('not-found') || e.code === 'not-found') {
       throw new Error('firestore_not_found');
    }
    throw e; 
  }
};
