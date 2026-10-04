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
function sanitizePetData(data) {
  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Normalizes Firestore document data into the application's Pet structure.
 */
function normalizePetDoc(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name || 'Unnamed Pet',
    type: data.type || data.species || 'Dog',
    species: data.species || data.type || 'Dog',
    breed: data.breed || 'Mixed Breed',
    age: data.age !== undefined ? data.age : 1,
    initial: data.initial || (data.name ? data.name.charAt(0).toUpperCase() : 'P'),
    photo: data.photo || null,
    photoName: data.photoName || null,
    deviceId: data.deviceId || null,
    deviceName: data.deviceName || null,
    status: data.status || 'Safe',
    riskLevel: data.riskLevel || 'LOW',
    heading: data.heading || 'NE',
    speed: data.speed || '0.0 km/h',
    zone: data.zone || 'Home Zone',
    color: data.color || '#B8865B',
    lat: typeof data.lat === 'number' ? data.lat : (data.mapCoords?.lat || 18.6448),
    lng: typeof data.lng === 'number' ? data.lng : (data.mapCoords?.lng || 73.7552),
    mapCoords: data.mapCoords || { x: 39.8, y: 40.5 },
    collarBattery: data.collarBattery !== undefined ? data.collarBattery : 90,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

/**
 * Subscribe to real-time updates for a user's pets collection.
 */
export function subscribePets(uid, onData, onError) {
  if (!uid) {
    onData([]);
    return () => {};
  }

  const petsCollectionRef = collection(db, 'users', uid, 'pets');
  console.log(`[Firestore] Subscribing to pets listener for UID: ${uid} at path: users/${uid}/pets`);

  const unsubscribe = onSnapshot(
    petsCollectionRef,
    (snapshot) => {
      const pets = snapshot.docs.map(normalizePetDoc);
      console.log(`[Firestore] Real-time snapshot received: ${pets.length} pets loaded.`);
      onData(pets);
    },
    (error) => {
      console.error('[Firestore] subscribePets snapshot error:', {
        uid,
        path: `users/${uid}/pets`,
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
 * Fetch all pets for a user once.
 */
export async function getPets(uid) {
  if (!uid) {
    console.error('[Firestore] getPets aborted: user UID missing');
    return { success: false, error: 'User is not authenticated' };
  }

  try {
    const petsCollectionRef = collection(db, 'users', uid, 'pets');
    console.log(`[Firestore] Fetching pets from path: users/${uid}/pets`);
    const snapshot = await getDocs(petsCollectionRef);
    const pets = snapshot.docs.map(normalizePetDoc);
    console.log(`[Firestore] getPets SUCCESS: Fetched ${pets.length} pets.`);
    return { success: true, pets };
  } catch (error) {
    console.error('[Firestore] getPets FAILED:', {
      uid,
      path: `users/${uid}/pets`,
      errorCode: error.code,
      errorMessage: error.message,
      error,
    });
    return { success: false, error: error.message || 'Failed to load pets', rawError: error };
  }
}

/**
 * Create a new pet in users/{uid}/pets/{petId}.
 */
export async function createPet(uid, petData) {
  if (!uid) {
    console.error('[Firestore] createPet aborted: user UID missing');
    return { success: false, error: 'User is not authenticated' };
  }

  const petsCollectionRef = collection(db, 'users', uid, 'pets');
  const newDocRef = doc(petsCollectionRef);
  const petId = newDocRef.id;
  const docPath = `users/${uid}/pets/${petId}`;

  const defaultLat = 18.6448 + (Math.random() - 0.5) * 0.003;
  const defaultLng = 73.7552 + (Math.random() - 0.5) * 0.003;

  const payload = sanitizePetData({
    name: petData.name?.trim() || 'New Pet',
    type: petData.type || petData.species || 'Dog',
    species: petData.species || petData.type || 'Dog',
    breed: petData.breed?.trim() || 'Mixed Breed',
    age: Number(petData.age) || 1,
    initial: (petData.name?.trim() || 'P').charAt(0).toUpperCase(),
    photo: petData.photo || null,
    photoName: petData.photoName || null,
    deviceId: petData.deviceId || null,
    deviceName: petData.deviceName || null,
    status: petData.status || 'Safe',
    riskLevel: petData.riskLevel || 'LOW',
    heading: petData.heading || 'NE',
    speed: petData.speed || '0.0 km/h',
    zone: petData.zone || 'Home Zone',
    color: petData.color || '#B8865B',
    lat: typeof petData.lat === 'number' ? petData.lat : defaultLat,
    lng: typeof petData.lng === 'number' ? petData.lng : defaultLng,
    mapCoords: petData.mapCoords || { x: 30 + Math.random() * 30, y: 30 + Math.random() * 30 },
    collarBattery: petData.collarBattery !== undefined ? petData.collarBattery : 90,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  console.log('[Firestore] Initiating createPet write...', {
    uid,
    path: docPath,
    petId,
    sanitizedData: payload,
  });

  try {
    await setDoc(newDocRef, payload);
    console.log(`[Firestore] createPet SUCCESS! Document created at: ${docPath}`, { id: petId });

    return {
      success: true,
      pet: {
        ...payload,
        id: petId,
      },
    };
  } catch (error) {
    console.error('[Firestore] createPet FAILED with error:', {
      uid,
      path: docPath,
      errorCode: error.code,
      errorMessage: error.message,
      rawError: error,
    });
    return {
      success: false,
      error: error.message || 'Failed to create pet in Firestore',
      code: error.code,
      rawError: error,
    };
  }
}

/**
 * Update an existing pet in users/{uid}/pets/{petId}.
 */
export async function updatePet(uid, petId, petData) {
  if (!uid) {
    console.error('[Firestore] updatePet aborted: user UID missing');
    return { success: false, error: 'User is not authenticated' };
  }
  if (!petId) {
    console.error('[Firestore] updatePet aborted: petId missing');
    return { success: false, error: 'Pet ID is required' };
  }

  const petDocRef = doc(db, 'users', uid, 'pets', petId);
  const docPath = `users/${uid}/pets/${petId}`;

  const updatePayload = sanitizePetData({
    ...(petData.name !== undefined && { name: petData.name.trim() }),
    ...(petData.type !== undefined && { type: petData.type }),
    ...(petData.species !== undefined && { species: petData.species }),
    ...(petData.breed !== undefined && { breed: petData.breed.trim() }),
    ...(petData.age !== undefined && { age: Number(petData.age) }),
    ...(petData.initial !== undefined && { initial: petData.initial }),
    ...(petData.photo !== undefined && { photo: petData.photo }),
    ...(petData.photoName !== undefined && { photoName: petData.photoName }),
    ...(petData.deviceId !== undefined && { deviceId: petData.deviceId }),
    ...(petData.deviceName !== undefined && { deviceName: petData.deviceName }),
    ...(petData.status !== undefined && { status: petData.status }),
    ...(petData.riskLevel !== undefined && { riskLevel: petData.riskLevel }),
    ...(petData.heading !== undefined && { heading: petData.heading }),
    ...(petData.speed !== undefined && { speed: petData.speed }),
    ...(petData.zone !== undefined && { zone: petData.zone }),
    ...(petData.color !== undefined && { color: petData.color }),
    ...(petData.lat !== undefined && { lat: petData.lat }),
    ...(petData.lng !== undefined && { lng: petData.lng }),
    ...(petData.mapCoords !== undefined && { mapCoords: petData.mapCoords }),
    ...(petData.collarBattery !== undefined && { collarBattery: petData.collarBattery }),
    updatedAt: serverTimestamp(),
  });

  console.log('[Firestore] Initiating updatePet write...', {
    uid,
    petId,
    path: docPath,
    updatePayload,
  });

  try {
    await updateDoc(petDocRef, updatePayload);
    console.log(`[Firestore] updatePet SUCCESS! Document updated at: ${docPath}`);

    return {
      success: true,
      pet: {
        ...petData,
        id: petId,
      },
    };
  } catch (error) {
    console.error('[Firestore] updatePet FAILED with error:', {
      uid,
      petId,
      path: docPath,
      errorCode: error.code,
      errorMessage: error.message,
      rawError: error,
    });
    return {
      success: false,
      error: error.message || 'Failed to update pet in Firestore',
      code: error.code,
      rawError: error,
    };
  }
}

/**
 * Delete a pet document from users/{uid}/pets/{petId}.
 */
export async function deletePet(uid, petId) {
  if (!uid) {
    console.error('[Firestore] deletePet aborted: user UID missing');
    return { success: false, error: 'User is not authenticated' };
  }
  if (!petId) {
    console.error('[Firestore] deletePet aborted: petId missing');
    return { success: false, error: 'Pet ID is required' };
  }

  const petDocRef = doc(db, 'users', uid, 'pets', petId);
  const docPath = `users/${uid}/pets/${petId}`;

  console.log('[Firestore] Initiating deletePet write...', {
    uid,
    petId,
    path: docPath,
  });

  try {
    await deleteDoc(petDocRef);
    console.log(`[Firestore] deletePet SUCCESS! Document deleted at: ${docPath}`);
    return { success: true, id: petId };
  } catch (error) {
    console.error('[Firestore] deletePet FAILED with error:', {
      uid,
      petId,
      path: docPath,
      errorCode: error.code,
      errorMessage: error.message,
      rawError: error,
    });
    return {
      success: false,
      error: error.message || 'Failed to delete pet from Firestore',
      code: error.code,
      rawError: error,
    };
  }
}
