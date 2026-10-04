import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Remove undefined values as Firestore throws error on undefined fields.
 */
function sanitizeZoneData(data) {
  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Normalizes Firestore document data into the application's SafeZone structure.
 */
function normalizeZoneDoc(docSnap) {
  const data = docSnap.data();

  // Extract center coordinates
  const lat = typeof data.lat === 'number'
    ? data.lat
    : (typeof data.center?.lat === 'number' ? data.center.lat : 18.6445);
  const lng = typeof data.lng === 'number'
    ? data.lng
    : (typeof data.center?.lng === 'number' ? data.center.lng : 73.7550);

  const radiusNum = typeof data.radiusMeters === 'number'
    ? data.radiusMeters
    : (parseInt(data.radius, 10) || 50);

  return {
    id: docSnap.id,
    name: data.name || 'Safe Zone',
    shape: data.shape || data.type || 'Circle',
    type: data.type || 'Safe Zone',
    lat,
    lng,
    center: { lat, lng },
    radius: data.radius || `${radiusNum} m`,
    radiusMeters: radiusNum,
    polygonPoints: Array.isArray(data.polygonPoints) && data.polygonPoints.length > 0
      ? data.polygonPoints.map((pt) => ({ lat: Number(pt.lat), lng: Number(pt.lng) }))
      : null,
    warningDistance: data.warningDistance || '15 m',
    assignedPets: Array.isArray(data.assignedPets) ? data.assignedPets : [],
    alertBehavior: {
      approachesBoundary: data.alertBehavior?.approachesBoundary ?? true,
      leavesSafeZone: data.alertBehavior?.leavesSafeZone ?? true,
    },
    badgeColor: data.badgeColor || '#005A36',
    borderColor: data.borderColor || '#005A36',
    bgColor: data.bgColor || 'rgba(0, 90, 54, 0.14)',
    borderStyle: data.borderStyle || 'dashed',
    status: data.status || 'Active',
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

/**
 * Subscribe to real-time updates for a user's safeZones collection.
 */
export function subscribeSafeZones(uid, onData, onError) {
  if (!uid) {
    onData([]);
    return () => {};
  }

  const zonesCollectionRef = collection(db, 'users', uid, 'safeZones');
  console.log(`[Firestore] Subscribing to safeZones listener for UID: ${uid} at path: users/${uid}/safeZones`);

  const unsubscribe = onSnapshot(
    zonesCollectionRef,
    (snapshot) => {
      const zones = snapshot.docs.map(normalizeZoneDoc);
      console.log(`[Firestore] Real-time snapshot received: ${zones.length} safe zones loaded.`);
      onData(zones);
    },
    (error) => {
      console.error('[Firestore] subscribeSafeZones snapshot error:', {
        uid,
        path: `users/${uid}/safeZones`,
        errorCode: error.code,
        errorMessage: error.message,
        error,
      });
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Fetch all safe zones for a user once.
 */
export async function getSafeZones(uid) {
  if (!uid) {
    console.error('[Firestore] getSafeZones aborted: user UID missing');
    return { success: false, error: 'User is not authenticated' };
  }

  try {
    const zonesCollectionRef = collection(db, 'users', uid, 'safeZones');
    console.log(`[Firestore] Fetching safe zones from path: users/${uid}/safeZones`);
    const snapshot = await getDocs(zonesCollectionRef);
    const safeZones = snapshot.docs.map(normalizeZoneDoc);
    console.log(`[Firestore] getSafeZones SUCCESS: Fetched ${safeZones.length} safe zones.`);
    return { success: true, safeZones };
  } catch (error) {
    console.error('[Firestore] getSafeZones FAILED:', {
      uid,
      path: `users/${uid}/safeZones`,
      errorCode: error.code,
      errorMessage: error.message,
      error,
    });
    return { success: false, error: error.message || 'Failed to load safe zones', rawError: error };
  }
}

/**
 * Create a new safe zone in users/{uid}/safeZones/{safeZoneId}.
 */
export async function createSafeZone(uid, zoneData) {
  if (!uid) {
    console.error('[Firestore] createSafeZone aborted: user UID missing');
    return { success: false, error: 'User is not authenticated' };
  }

  const zonesCollectionRef = collection(db, 'users', uid, 'safeZones');
  const newDocRef = doc(zonesCollectionRef);
  const zoneId = newDocRef.id;
  const docPath = `users/${uid}/safeZones/${zoneId}`;

  const lat = typeof zoneData.lat === 'number'
    ? zoneData.lat
    : (typeof zoneData.center?.lat === 'number' ? zoneData.center.lat : 18.6445);
  const lng = typeof zoneData.lng === 'number'
    ? zoneData.lng
    : (typeof zoneData.center?.lng === 'number' ? zoneData.center.lng : 73.7550);

  const radiusMeters = typeof zoneData.radiusMeters === 'number'
    ? zoneData.radiusMeters
    : (parseInt(zoneData.radius, 10) || 50);

  const isPolygon = zoneData.shape === 'Polygon' || Array.isArray(zoneData.polygonPoints);

  const payload = sanitizeZoneData({
    name: zoneData.name?.trim() || 'Home Safe Zone',
    shape: isPolygon ? 'Polygon' : 'Circle',
    type: zoneData.type || 'Safe Zone',
    lat,
    lng,
    center: { lat, lng },
    radius: zoneData.radius || `${radiusMeters} m`,
    radiusMeters,
    polygonPoints: isPolygon && Array.isArray(zoneData.polygonPoints)
      ? zoneData.polygonPoints.map((pt) => ({ lat: Number(pt.lat), lng: Number(pt.lng) }))
      : null,
    warningDistance: zoneData.warningDistance || '15 m',
    assignedPets: Array.isArray(zoneData.assignedPets) ? zoneData.assignedPets : [],
    alertBehavior: {
      approachesBoundary: zoneData.alertBehavior?.approachesBoundary ?? true,
      leavesSafeZone: zoneData.alertBehavior?.leavesSafeZone ?? true,
    },
    badgeColor: zoneData.badgeColor || '#005A36',
    borderColor: zoneData.borderColor || '#005A36',
    bgColor: zoneData.bgColor || 'rgba(0, 90, 54, 0.14)',
    borderStyle: zoneData.borderStyle || 'dashed',
    status: zoneData.status || 'Active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  console.log('[Firestore] Initiating createSafeZone write...', {
    uid,
    path: docPath,
    zoneId,
    sanitizedData: payload,
  });

  try {
    await setDoc(newDocRef, payload);
    console.log(`[Firestore] createSafeZone SUCCESS! Document created at: ${docPath}`, { id: zoneId });

    return {
      success: true,
      zone: {
        ...payload,
        id: zoneId,
      },
    };
  } catch (error) {
    console.error('[Firestore] createSafeZone FAILED with error:', {
      uid,
      path: docPath,
      errorCode: error.code,
      errorMessage: error.message,
      rawError: error,
    });
    return {
      success: false,
      error: error.message || 'Failed to create safe zone in Firestore',
      code: error.code,
      rawError: error,
    };
  }
}

/**
 * Update an existing safe zone in users/{uid}/safeZones/{safeZoneId}.
 */
export async function updateSafeZone(uid, safeZoneId, zoneData) {
  if (!uid) {
    console.error('[Firestore] updateSafeZone aborted: user UID missing');
    return { success: false, error: 'User is not authenticated' };
  }
  if (!safeZoneId) {
    console.error('[Firestore] updateSafeZone aborted: safeZoneId missing');
    return { success: false, error: 'Safe Zone ID is required' };
  }

  const zoneDocRef = doc(db, 'users', uid, 'safeZones', safeZoneId);
  const docPath = `users/${uid}/safeZones/${safeZoneId}`;

  const lat = typeof zoneData.lat === 'number'
    ? zoneData.lat
    : (typeof zoneData.center?.lat === 'number' ? zoneData.center.lat : undefined);
  const lng = typeof zoneData.lng === 'number'
    ? zoneData.lng
    : (typeof zoneData.center?.lng === 'number' ? zoneData.center.lng : undefined);

  const radiusMeters = typeof zoneData.radiusMeters === 'number'
    ? zoneData.radiusMeters
    : (zoneData.radius ? parseInt(zoneData.radius, 10) : undefined);

  const updatePayload = sanitizeZoneData({
    ...(zoneData.name !== undefined && { name: zoneData.name.trim() }),
    ...(zoneData.shape !== undefined && { shape: zoneData.shape }),
    ...(zoneData.type !== undefined && { type: zoneData.type }),
    ...(lat !== undefined && { lat }),
    ...(lng !== undefined && { lng }),
    ...((lat !== undefined || lng !== undefined) && { center: { lat, lng } }),
    ...(zoneData.radius !== undefined && { radius: zoneData.radius }),
    ...(radiusMeters !== undefined && { radiusMeters }),
    ...(zoneData.polygonPoints !== undefined && {
      polygonPoints: Array.isArray(zoneData.polygonPoints)
        ? zoneData.polygonPoints.map((pt) => ({ lat: Number(pt.lat), lng: Number(pt.lng) }))
        : null,
    }),
    ...(zoneData.warningDistance !== undefined && { warningDistance: zoneData.warningDistance }),
    ...(zoneData.assignedPets !== undefined && { assignedPets: zoneData.assignedPets }),
    ...(zoneData.alertBehavior !== undefined && { alertBehavior: zoneData.alertBehavior }),
    ...(zoneData.badgeColor !== undefined && { badgeColor: zoneData.badgeColor }),
    ...(zoneData.borderColor !== undefined && { borderColor: zoneData.borderColor }),
    ...(zoneData.bgColor !== undefined && { bgColor: zoneData.bgColor }),
    ...(zoneData.borderStyle !== undefined && { borderStyle: zoneData.borderStyle }),
    ...(zoneData.status !== undefined && { status: zoneData.status }),
    updatedAt: serverTimestamp(),
  });

  console.log('[Firestore] Initiating updateSafeZone write...', {
    uid,
    safeZoneId,
    path: docPath,
    updatePayload,
  });

  try {
    await updateDoc(zoneDocRef, updatePayload);
    console.log(`[Firestore] updateSafeZone SUCCESS! Document updated at: ${docPath}`);

    return {
      success: true,
      zone: {
        ...zoneData,
        id: safeZoneId,
      },
    };
  } catch (error) {
    console.error('[Firestore] updateSafeZone FAILED with error:', {
      uid,
      safeZoneId,
      path: docPath,
      errorCode: error.code,
      errorMessage: error.message,
      rawError: error,
    });
    return {
      success: false,
      error: error.message || 'Failed to update safe zone in Firestore',
      code: error.code,
      rawError: error,
    };
  }
}

/**
 * Delete a safe zone document from users/{uid}/safeZones/{safeZoneId}.
 */
export async function deleteSafeZone(uid, safeZoneId) {
  if (!uid) {
    console.error('[Firestore] deleteSafeZone aborted: user UID missing');
    return { success: false, error: 'User is not authenticated' };
  }
  if (!safeZoneId) {
    console.error('[Firestore] deleteSafeZone aborted: safeZoneId missing');
    return { success: false, error: 'Safe Zone ID is required' };
  }

  const zoneDocRef = doc(db, 'users', uid, 'safeZones', safeZoneId);
  const docPath = `users/${uid}/safeZones/${safeZoneId}`;

  console.log('[Firestore] Initiating deleteSafeZone write...', {
    uid,
    safeZoneId,
    path: docPath,
  });

  try {
    await deleteDoc(zoneDocRef);
    console.log(`[Firestore] deleteSafeZone SUCCESS! Document deleted at: ${docPath}`);
    return { success: true, id: safeZoneId };
  } catch (error) {
    console.error('[Firestore] deleteSafeZone FAILED with error:', {
      uid,
      safeZoneId,
      path: docPath,
      errorCode: error.code,
      errorMessage: error.message,
      rawError: error,
    });
    return {
      success: false,
      error: error.message || 'Failed to delete safe zone from Firestore',
      code: error.code,
      rawError: error,
    };
  }
}
