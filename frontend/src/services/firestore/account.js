import {
  collection,
  doc,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import {
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  GoogleAuthProvider,
} from 'firebase/auth';
import { db, auth } from '../../firebase.js';

/**
 * Re-authenticates the current user if Firebase requires recent login.
 */
export async function reauthenticateCurrentUser(password = null) {
  const user = auth.currentUser;
  if (!user) return { success: false, error: 'No authenticated user found' };

  const providerId = user.providerData?.[0]?.providerId;

  try {
    if (providerId === 'google.com') {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await reauthenticateWithPopup(user, provider);
      return { success: true };
    } else if (password) {
      if (!user.email) return { success: false, error: 'User email not found for re-authentication' };
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      return { success: true };
    } else {
      return {
        success: false,
        error: 'Password is required to re-authenticate this account.',
        requiresPassword: true,
      };
    }
  } catch (error) {
    console.error('[Auth] Re-authentication failed:', error);
    return {
      success: false,
      error: error.message || 'Re-authentication failed. Please try again.',
      code: error.code,
    };
  }
}

/**
 * Deletes all Firestore data belonging to the user:
 * - users/{uid}/pets/*
 * - users/{uid}/safeZones/*
 * - users/{uid}/alerts/*
 * - users/{uid}/settings/*
 * - users/{uid}
 *
 * Then deletes the Firebase Auth user account.
 */
export async function deleteFullUserAccount(passwordForReauth = null) {
  const user = auth.currentUser;
  if (!user || !user.uid) {
    return { success: false, error: 'User is not authenticated' };
  }

  const uid = user.uid;
  const isGoogleUser = user.providerData?.some((p) => p.providerId === 'google.com');

  console.log(`[Account] Starting full account deletion for UID: ${uid}`);

  // 1. Delete all Firestore collections belonging to the user
  try {
    const subcollections = ['pets', 'safeZones', 'alerts', 'settings'];

    for (const subcol of subcollections) {
      const colRef = collection(db, 'users', uid, subcol);
      const snapshot = await getDocs(colRef);
      const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);
      console.log(`[Account] Deleted ${deletePromises.length} documents from users/${uid}/${subcol}`);
    }

    // Delete user profile root document
    const userDocRef = doc(db, 'users', uid);
    await deleteDoc(userDocRef);
    console.log(`[Account] Deleted root document users/${uid}`);
  } catch (firestoreError) {
    console.error('[Account] Error deleting Firestore data:', firestoreError);
    // Proceed to attempt auth deletion or return error
  }

  // 2. Delete the Firebase Auth User
  try {
    await deleteUser(user);
    console.log(`[Account] Firebase Auth user deleted successfully for UID: ${uid}`);
    return { success: true };
  } catch (authError) {
    console.error('[Account] Firebase deleteUser error:', authError);

    // Handle requires-recent-login
    if (authError.code === 'auth/requires-recent-login') {
      // Try re-authenticating if password was supplied or if Google user
      if (isGoogleUser) {
        console.log('[Account] Attempting Google re-authentication popup...');
        const reauthResult = await reauthenticateCurrentUser();
        if (reauthResult.success && auth.currentUser) {
          try {
            await deleteUser(auth.currentUser);
            return { success: true };
          } catch (retryError) {
            return {
              success: false,
              error: retryError.message || 'Failed to delete account after re-authentication',
              code: retryError.code,
            };
          }
        }
        return {
          success: false,
          requiresReauth: true,
          isGoogleUser: true,
          error: 'Please re-authenticate with Google before deleting your account.',
        };
      } else if (passwordForReauth) {
        console.log('[Account] Attempting password re-authentication...');
        const reauthResult = await reauthenticateCurrentUser(passwordForReauth);
        if (reauthResult.success && auth.currentUser) {
          try {
            await deleteUser(auth.currentUser);
            return { success: true };
          } catch (retryError) {
            return {
              success: false,
              error: retryError.message || 'Failed to delete account after re-authentication',
              code: retryError.code,
            };
          }
        } else {
          return {
            success: false,
            requiresReauth: true,
            isGoogleUser: false,
            error: reauthResult.error || 'Incorrect password for re-authentication.',
          };
        }
      } else {
        return {
          success: false,
          requiresReauth: true,
          isGoogleUser: false,
          error: 'Security requirement: Please enter your password to confirm account deletion.',
        };
      }
    }

    return {
      success: false,
      error: authError.message || 'Failed to delete account.',
      code: authError.code,
    };
  }
}
