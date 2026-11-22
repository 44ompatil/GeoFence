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
 * Extracts a numeric timestamp in milliseconds from an alert object.
 * Supports Firestore Timestamps, JS Dates, seconds/nanoseconds, numeric values, and fallback.
 */
export function getAlertTimestampMs(alert) {
  if (!alert) return 0;
  if (alert.createdAt?.toMillis) return alert.createdAt.toMillis();
  if (alert.createdAt?.toDate) return alert.createdAt.toDate().getTime();
  if (alert.createdAt instanceof Date) return alert.createdAt.getTime();
  if (typeof alert.createdAt === 'number') return alert.createdAt;
  if (typeof alert.createdAt?.seconds === 'number') {
    return alert.createdAt.seconds * 1000 + (alert.createdAt.nanoseconds || 0) / 1e6;
  }
  if (alert._localTimestamp) return alert._localTimestamp;
  return 0;
}

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

  // Format timestamp for display with human-readable date/time
  let timestampDisplay = data.timestamp || '';
  if (data.createdAt?.toDate) {
    const d = data.createdAt.toDate();
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    timestampDisplay = isToday ? timeStr : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
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
 * Alerts are consistently ordered newest first by creation timestamp.
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
      // Ensure robust newest-first sorting even if serverTimestamp is resolving
      alerts.sort((a, b) => getAlertTimestampMs(b) - getAlertTimestampMs(a));
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
          alerts.sort((a, b) => getAlertTimestampMs(b) - getAlertTimestampMs(a));
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
    alerts.sort((a, b) => getAlertTimestampMs(b) - getAlertTimestampMs(a));
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

    const localNow = new Date();
    const formattedTime = localNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
        _localTimestamp: localNow.getTime(),
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

/**
 * Clear all alerts for the authenticated user from Firestore.
 * Does not touch pets, safe zones, or user settings.
 */
export async function clearAllAlerts(uid) {
  if (!uid) return { success: false, error: 'User is not authenticated' };

  try {
    const alertsRef = collection(db, 'users', uid, 'alerts');
    const snapshot = await getDocs(alertsRef);
    if (snapshot.empty) {
      console.log(`[Firestore] clearAllAlerts: No alerts to delete for UID: ${uid}`);
      return { success: true, count: 0 };
    }

    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
    console.log(`[Firestore] clearAllAlerts SUCCESS: Deleted ${deletePromises.length} alerts from users/${uid}/alerts`);
    return { success: true, count: deletePromises.length };
  } catch (error) {
    console.error('[Firestore] clearAllAlerts error:', error);
    return { success: false, error: error.message };
  }
}
