
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { AppState } from '../types';

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

const DOC_ID = 'current_sitting';

// Default state to return if cloud is empty
const DEFAULT_STATE: AppState = {
  sitterName: '',
  startDate: new Date().toISOString().split('T')[0],
  totalDays: 3,
  logs: {},
  initialized: false,
};

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

export const subscribeToStore = (
  onData: (data: AppState) => void, 
  onError?: (error: string) => void
) => {
  if (!db) {
    console.warn("Firebase not configured. Data will not sync.");
    return () => {};
  }
  
  // Reference to the single document where we store the entire state
  const docRef = doc(db, 'paws_updates', DOC_ID);
  
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as AppState;
      onData(data);
    } else {
      console.log("No existing data found in cloud. Initializing with default state...");
      // CRITICAL FIX: Return default state so the app stops loading and shows Onboarding
      onData(DEFAULT_STATE);
    }
  }, (error) => {
    console.error("Sync error detail:", error);
    
    let userFriendlyError = error.message;
    
    if (error.message.includes('permission-denied') || error.code === 'permission-denied') {
      userFriendlyError = 'firestore_permission_denied';
    } else if (error.message.includes('not-found') || error.code === 'not-found') {
       // This typically means the database instance itself doesn't exist in the project
      userFriendlyError = 'firestore_not_found';
    }

    if (onError) onError(userFriendlyError);
  });

  return unsubscribe;
};

export const saveToCloud = async (state: AppState): Promise<boolean> => {
  if (!db) return false;

  try {
    const docRef = doc(db, 'paws_updates', DOC_ID);
    
    // Sanitize state to remove undefined values before saving
    const safeState = sanitizeData(state);
    
    // Using merge true is safer
    await setDoc(docRef, safeState, { merge: true });
    return true;
  } catch (e: any) {
    console.error("Error saving to cloud", e);
    if (e.message.includes('not-found') || e.code === 'not-found') {
       throw new Error('firestore_not_found');
    }
    throw e; 
  }
};

export const clearCloudData = async (): Promise<void> => {
    console.log("Attempting to clear cloud data...");
    if (!db) {
        console.error("Cannot clear data: Database not initialized");
        throw new Error("Database connection not established");
    }
    try {
        const docRef = doc(db, 'paws_updates', DOC_ID);
        // Reset to uninitialized by writing the default state over the current data
        await setDoc(docRef, DEFAULT_STATE);
        console.log("Cloud data cleared successfully");
    } catch (e) {
        console.error("Error clearing cloud data:", e);
        throw e;
    }
};
