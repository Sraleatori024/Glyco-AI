import { doc, setDoc, deleteDoc, collection, getDocs, getDoc, serverTimestamp, query, where } from "firebase/firestore";
import { db, auth } from "./firebase";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Maps client view names to top-level Firestore collection names
export function mapCollectionName(collectionName: string): string {
  switch (collectionName) {
    case "glucose":
      return "glucose_records";
    case "food":
      return "meals";
    case "meds":
      return "medications";
    case "exercises":
      return "exercise_history";
    case "chat":
      return "ai_history";
    default:
      return collectionName; // reports, subscriptions, notifications, etc.
  }
}

// Automatically loads or creates the user's root profile document
export async function getOrCreateUserDoc(
  uid: string,
  email: string,
  displayName?: string | null,
  photoURL?: string | null
) {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      const initialUser = {
        uid,
        name: displayName || email.split("@")[0] || "Usuário",
        email,
        photoURL: photoURL || null,
        role: "user",
        plan: "free",
        subscriptionStatus: "inactive",
        diabetesType: null,
        weight: null,
        height: null,
        targetGlucose: null,
        
        // Onboarding defaults
        age: 35,
        gender: "Masculino",
        medications: [],
        usesInsulin: false,
        insulinTypes: [],
        targetGlucoseMinJejum: 70,
        targetGlucoseMaxJejum: 130,
        targetGlucoseMaxPosPrandial: 180,
        goals: [],

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(docRef, initialUser);
      return initialUser;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }
}

// Promote user to admin
export async function promoteToAdmin(uid: string) {
  try {
    const docRef = doc(db, "users", uid);
    await setDoc(docRef, { 
      role: "admin", 
      updatedAt: new Date().toISOString() 
    }, { merge: true });
    console.log(`User ${uid} successfully promoted to Admin.`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
}

// Helper to save document securely under top-level collections with a required uid
export async function syncDocToFirestore(collectionName: string, docId: string, data: any) {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  if (collectionName === "profile") {
    try {
      const docRef = doc(db, "users", userId);
      await setDoc(docRef, {
        ...data,
        uid: userId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
    }
    return;
  }

  const targetCollection = mapCollectionName(collectionName);
  try {
    const docRef = doc(db, targetCollection, docId);
    await setDoc(docRef, {
      ...data,
      uid: userId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${targetCollection}/${docId}`);
  }
}

// Helper to delete document securely from top-level collections
export async function deleteDocFromFirestore(collectionName: string, docId: string) {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  const targetCollection = mapCollectionName(collectionName);
  try {
    const docRef = doc(db, targetCollection, docId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${targetCollection}/${docId}`);
  }
}
