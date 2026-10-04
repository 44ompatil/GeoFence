import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase.js';

/**
 * Remove undefined values before writing to Firestore.
 */
function sanitizeData(data) {
  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
        clean[key] = sanitizeData(value);
      } else {
        clean[key] = value;
      }
    }
  }
  return clean;
}

/**
 * Normalizes an alert document from Firestore into a consistent UI model.
 */
function normalizeAlert(docSnap) {
  const data = docSnap.data();
  const id = docSnap.id;

  const isResolved = Boolean(data.resolved);

  // Format timestamp for display
  let timestampDisplay = data.timestamp || '';
  if (!timestampDisplay && data.createdAt?.toDate) {
    const d = data.createdAt.toDate();
    timestampDisplay = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (!timestampDisplay) {
    timestampDisplay = 'Just now';
  }

  return {
    id,
    petId: data.petId || '',
    petName: data.petName || 'Pet',
    petColor: data.petColor || '#B8865B',
    petInitial: data.petInitial || (data.petName ? data.petName.charAt(0).toUpperCase() : 'P'),
    type: data.type || 'BOUNDARY_BREACH',
    severity: data.severity || (isResolved ? 'RESOLVED' : 'CRITICAL'),
    title: data.title || data.event || 'Alert',
    message: data.message || '',
    event: data.event || data.title || 'Boundary Breach',
    zone: data.zone || data.zoneName || 'Designated Zone',
    zoneId: data.zoneId || '',
    distanceFromBoundary: data.distanceFromBoundary ?? null,
    timestamp: timestampDisplay,
    status: isResolved ? 'Resolved' : (data.status || 'Active'),
    resolved: isResolved,
    resolvedAt: data.resolvedAt || null,
    filterCategory: isResolved ? 'resolved' : 'active',
    createdAt: data.createdAt || null,
  };
}

/**
 * Subscribe to real-time alerts collection for the authenticated user.
 */
export function subscribeAlerts(uid, onData, onError) {
  if (!uid) {
    onData([]);
    return () => {};
  }

  const alertsRef = collection(db, 'users', uid, 'alerts');
  console.log(`[Firestore] Subscribing to alerts for UID: ${uid} at path: users/${uid}/alerts`);

  // Query ordered by createdAt descending
  const q = query(alertsRef, orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const alerts = snapshot.docs.map(normalizeAlert);
      console.log(`[Firestore] Received ${alerts.length} alerts snapshot for UID: ${uid}`);
      onData(alerts);
    },
    (error) => {
      console.warn('[Firestore] subscribeAlerts query with orderBy failed, falling back to base collection:', error);
      // Fallback in case indexing on createdAt is still initializing
      const fallbackUnsubscribe = onSnapshot(
        alertsRef,
        (snapshot) => {
          const alerts = snapshot.docs.map(normalizeAlert);
          alerts.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
          });
          onData(alerts);
        },
        (fallbackError) => {
          console.error('[Firestore] subscribeAlerts fallback error:', fallbackError);
          if (onError) onError(fallbackError);
        }
      );
      return fallbackUnsubscribe;
    }
  );

  return unsubscribe;
}

/**
 * Fetch all alerts once for an authenticated user.
 */
export async function getAlerts(uid) {
  if (!uid) return { success: false, error: 'User is not authenticated' };

  try {
    const alertsRef = collection(db, 'users', uid, 'alerts');
    const snapshot = await getDocs(alertsRef);
    const alerts = snapshot.docs.map(normalizeAlert);
    return { success: true, alerts };
  } catch (error) {
    console.error('[Firestore] getAlerts error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a new real alert document in Firestore.
 */
export async function createAlert(uid, alertData) {
  if (!uid) return { success: false, error: 'User is not authenticated' };

  try {
    const alertsRef = collection(db, 'users', uid, 'alerts');

    const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const payload = sanitizeData({
      petId: alertData.petId || '',
      petName: alertData.petName || 'Pet',
      petColor: alertData.petColor || '#B8865B',
      petInitial: alertData.petInitial || (alertData.petName ? alertData.petName.charAt(0).toUpperCase() : 'P'),
      type: alertData.type || 'BOUNDARY_BREACH',
      severity: alertData.severity || 'CRITICAL',
      title: alertData.title || alertData.event || 'Boundary Breach',
      event: alertData.event || alertData.title || 'Boundary Breach',
      message: alertData.message || '',
      zone: alertData.zone || alertData.zoneName || 'Designated Zone',
      zoneId: alertData.zoneId || '',
      distanceFromBoundary: alertData.distanceFromBoundary ?? null,
      timestamp: alertData.timestamp || formattedTime,
      status: 'Active',
      resolved: false,
      resolvedAt: null,
      createdAt: serverTimestamp(),
    });

    console.log('[Firestore] Creating alert:', payload);
    const docRef = await addDoc(alertsRef, payload);
    console.log(`[Firestore] Alert created with ID: ${docRef.id}`);

    return {
      success: true,
      alert: {
        id: docRef.id,
        ...payload,
      },
    };
  } catch (error) {
    console.error('[Firestore] createAlert error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark an existing alert as resolved in Firestore.
 */
export async function markAlertResolved(uid, alertId) {
  if (!uid || !alertId) return { success: false, error: 'UID and alertId required' };

  try {
    const alertDocRef = doc(db, 'users', uid, 'alerts', alertId);
    console.log(`[Firestore] Marking alert ${alertId} as resolved`);

    await updateDoc(alertDocRef, {
      resolved: true,
      status: 'Resolved',
      severity: 'RESOLVED',
      resolvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(`[Firestore] Alert ${alertId} successfully resolved.`);
    return { success: true };
  } catch (error) {
    console.error('[Firestore] markAlertResolved error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete an alert from Firestore.
 */
export async function deleteAlert(uid, alertId) {
  if (!uid || !alertId) return { success: false, error: 'UID and alertId required' };

  try {
    const alertDocRef = doc(db, 'users', uid, 'alerts', alertId);
    await deleteDoc(alertDocRef);
    console.log(`[Firestore] Alert ${alertId} deleted.`);
    return { success: true };
  } catch (error) {
    console.error('[Firestore] deleteAlert error:', error);
    return { success: false, error: error.message };
  }
}
