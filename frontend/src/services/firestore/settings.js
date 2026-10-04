import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase.js';

export const DEFAULT_SETTINGS = {
  tracking: {
    locationInterval: 'Every 15 seconds',
    locationUpdateInterval: 'Every 15 seconds',
    gpsAccuracy: 'High accuracy',
    batteryMode: 'Balanced',
    batterySavingMode: 'Balanced',
    timeFormat: '24-hour',
    boundaryWarning: '15 m',
    boundaryWarningDistance: '15 m',
  },
  notifications: {
    boundaryBreach: true,
    approachingBoundary: true,
    highRiskMovement: true,
    deviceOffline: true,
    lowBattery: true,
    quietHours: '10 PM – 7 AM',
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  },
  behaviour: {
    learning: true,
    behaviourLearning: true,
    adaptiveRisk: true,
    adaptiveRiskDetection: true,
    alertSensitivity: 'Balanced',
    learnedProfileStatus: 'Learning active',
    learnedProfileDays: 21,
  },
};

/**
 * Remove undefined values before writing to Firestore.
 */
function sanitizeData(data) {
  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        clean[key] = sanitizeData(value);
      } else {
        clean[key] = value;
      }
    }
  }
  return clean;
}

/**
 * Normalizes settings document from Firestore with default fallbacks.
 */
export function normalizeSettings(data) {
  if (!data) return DEFAULT_SETTINGS;
  return {
    tracking: {
      locationInterval: data.tracking?.locationInterval || data.tracking?.locationUpdateInterval || DEFAULT_SETTINGS.tracking.locationInterval,
      locationUpdateInterval: data.tracking?.locationUpdateInterval || data.tracking?.locationInterval || DEFAULT_SETTINGS.tracking.locationUpdateInterval,
      gpsAccuracy: data.tracking?.gpsAccuracy || DEFAULT_SETTINGS.tracking.gpsAccuracy,
      batteryMode: data.tracking?.batteryMode || data.tracking?.batterySavingMode || DEFAULT_SETTINGS.tracking.batteryMode,
      batterySavingMode: data.tracking?.batterySavingMode || data.tracking?.batteryMode || DEFAULT_SETTINGS.tracking.batterySavingMode,
      timeFormat: data.tracking?.timeFormat || DEFAULT_SETTINGS.tracking.timeFormat,
      boundaryWarning: data.tracking?.boundaryWarning || data.tracking?.boundaryWarningDistance || DEFAULT_SETTINGS.tracking.boundaryWarning,
      boundaryWarningDistance: data.tracking?.boundaryWarningDistance || data.tracking?.boundaryWarning || DEFAULT_SETTINGS.tracking.boundaryWarningDistance,
    },
    notifications: {
      boundaryBreach: data.notifications?.boundaryBreach ?? DEFAULT_SETTINGS.notifications.boundaryBreach,
      approachingBoundary: data.notifications?.approachingBoundary ?? DEFAULT_SETTINGS.notifications.approachingBoundary,
      highRiskMovement: data.notifications?.highRiskMovement ?? DEFAULT_SETTINGS.notifications.highRiskMovement,
      deviceOffline: data.notifications?.deviceOffline ?? DEFAULT_SETTINGS.notifications.deviceOffline,
      lowBattery: data.notifications?.lowBattery ?? DEFAULT_SETTINGS.notifications.lowBattery,
      quietHours: data.notifications?.quietHours || DEFAULT_SETTINGS.notifications.quietHours,
      quietHoursStart: data.notifications?.quietHoursStart || DEFAULT_SETTINGS.notifications.quietHoursStart,
      quietHoursEnd: data.notifications?.quietHoursEnd || DEFAULT_SETTINGS.notifications.quietHoursEnd,
    },
    behaviour: {
      learning: data.behaviour?.learning ?? data.behaviour?.behaviourLearning ?? DEFAULT_SETTINGS.behaviour.learning,
      behaviourLearning: data.behaviour?.behaviourLearning ?? data.behaviour?.learning ?? DEFAULT_SETTINGS.behaviour.behaviourLearning,
      adaptiveRisk: data.behaviour?.adaptiveRisk ?? data.behaviour?.adaptiveRiskDetection ?? DEFAULT_SETTINGS.behaviour.adaptiveRisk,
      adaptiveRiskDetection: data.behaviour?.adaptiveRiskDetection ?? data.behaviour?.adaptiveRisk ?? DEFAULT_SETTINGS.behaviour.adaptiveRiskDetection,
      alertSensitivity: data.behaviour?.alertSensitivity || DEFAULT_SETTINGS.behaviour.alertSensitivity,
      learnedProfileStatus: data.behaviour?.learnedProfileStatus || DEFAULT_SETTINGS.behaviour.learnedProfileStatus,
      learnedProfileDays: data.behaviour?.learnedProfileDays ?? DEFAULT_SETTINGS.behaviour.learnedProfileDays,
    },
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

/**
 * Ensures user settings document and profile exist in Firestore without overwriting custom settings.
 */
export async function ensureUserSettingsInitialized(uid, userProfile = null) {
  if (!uid) return { success: false, error: 'User UID required' };

  const projectId = db.app?.options?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dt-geofence';
  const docPath = `users/${uid}/settings/preferences`;

  console.log('[Firestore] Checking/Ensuring settings document at runtime:', {
    authenticatedUid: uid,
    projectId,
    exactDocumentPath: docPath,
  });

  try {
    const settingsDocRef = doc(db, 'users', uid, 'settings', 'preferences');
    const docSnap = await getDoc(settingsDocRef);

    if (!docSnap.exists()) {
      const initialPayload = sanitizeData({
        ...DEFAULT_SETTINGS,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log('[Firestore] Initializing default settings document:', {
        authenticatedUid: uid,
        projectId,
        exactDocumentPath: docPath,
        payload: initialPayload,
      });

      await setDoc(settingsDocRef, initialPayload, { merge: true });
      console.log('[Firestore] Default settings initialized successfully at:', docPath);
    }

    if (userProfile) {
      const userDocRef = doc(db, 'users', uid);
      await setDoc(
        userDocRef,
        sanitizeData({
          uid,
          displayName: userProfile.displayName || '',
          email: userProfile.email || '',
          photoURL: userProfile.photoURL || '',
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
    }

    return { success: true };
  } catch (error) {
    console.error('[Firestore] ensureUserSettingsInitialized write error:', {
      authenticatedUid: uid,
      projectId,
      exactDocumentPath: docPath,
      errorCode: error.code,
      errorMessage: error.message,
      error,
    });
    return { success: false, error: error.message, code: error.code };
  }
}

/**
 * Subscribe to real-time settings document for the authenticated user.
 */
export function subscribeSettings(uid, onData, onError) {
  if (!uid) {
    onData(DEFAULT_SETTINGS, false);
    return () => {};
  }

  const projectId = db.app?.options?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dt-geofence';
  const settingsDocRef = doc(db, 'users', uid, 'settings', 'preferences');
  const docPath = `users/${uid}/settings/preferences`;

  console.log('[Firestore] Subscribing to settings:', {
    authenticatedUid: uid,
    projectId,
    exactDocumentPath: docPath,
  });

  const unsubscribe = onSnapshot(
    settingsDocRef,
    (docSnap) => {
      const exists = docSnap.exists();
      const settings = exists ? normalizeSettings(docSnap.data()) : DEFAULT_SETTINGS;
      console.log(`[Firestore] Settings snapshot received from ${docPath} (exists: ${exists})`);
      onData(settings, exists);
    },
    (error) => {
      console.error('[Firestore] subscribeSettings snapshot error:', {
        authenticatedUid: uid,
        projectId,
        exactDocumentPath: docPath,
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
 * Fetch settings once from users/{uid}/settings/preferences.
 */
export async function getSettings(uid) {
  if (!uid) {
    console.error('[Firestore] getSettings aborted: UID missing');
    return { success: false, error: 'User is not authenticated' };
  }

  const projectId = db.app?.options?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dt-geofence';
  const docPath = `users/${uid}/settings/preferences`;

  try {
    const settingsDocRef = doc(db, 'users', uid, 'settings', 'preferences');
    console.log('[Firestore] Fetching settings:', {
      authenticatedUid: uid,
      projectId,
      exactDocumentPath: docPath,
    });
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
      const settings = normalizeSettings(docSnap.data());
      return { success: true, exists: true, settings };
    } else {
      return { success: true, exists: false, settings: DEFAULT_SETTINGS };
    }
  } catch (error) {
    console.error('[Firestore] getSettings error:', {
      authenticatedUid: uid,
      projectId,
      exactDocumentPath: docPath,
      errorCode: error.code,
      errorMessage: error.message,
      error,
    });
    return { success: false, error: error.message || 'Failed to load settings', rawError: error };
  }
}

/**
 * Save / Merge settings into users/{uid}/settings/preferences.
 */
export async function saveSettings(uid, partialSettings) {
  if (!uid) {
    console.error('[Firestore] saveSettings aborted: UID missing');
    return { success: false, error: 'User is not authenticated' };
  }

  const projectId = db.app?.options?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dt-geofence';
  const settingsDocRef = doc(db, 'users', uid, 'settings', 'preferences');
  const docPath = `users/${uid}/settings/preferences`;

  const payload = sanitizeData({
    ...partialSettings,
    updatedAt: serverTimestamp(),
  });

  console.log('[Firestore] Initiating saveSettings write:', {
    authenticatedUid: uid,
    projectId,
    exactDocumentPath: docPath,
    settingsPayload: payload,
  });

  try {
    await setDoc(settingsDocRef, payload, { merge: true });
    console.log(`[Firestore] saveSettings SUCCESS: Document updated at ${docPath}`);
    return { success: true, settings: payload };
  } catch (error) {
    console.error('[Firestore] saveSettings FAILED:', {
      authenticatedUid: uid,
      projectId,
      exactDocumentPath: docPath,
      settingsPayload: payload,
      errorCode: error.code,
      errorMessage: error.message,
      rawError: error,
    });
    return {
      success: false,
      error: error.message || 'Failed to save settings to Firestore',
      code: error.code,
      rawError: error,
    };
  }
}
