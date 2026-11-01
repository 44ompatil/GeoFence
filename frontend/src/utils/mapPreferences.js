import { useState, useEffect } from 'react';

const MAP_TYPE_KEY = 'geofence_map_type';
const MAP_CENTER_KEY = 'geofence_last_map_center';
const MAP_ZOOM_KEY = 'geofence_last_map_zoom';

export const DEFAULT_MAP_CENTER = { lat: 18.6445, lng: 73.7550 };
export const DEFAULT_MAP_ZOOM = 16;

/**
 * Gets the persisted map mode from localStorage ('Map' | 'Satellite').
 */
export function getPersistedMapType() {
  try {
    const saved = localStorage.getItem(MAP_TYPE_KEY);
    return saved === 'Satellite' ? 'Satellite' : 'Map';
  } catch (e) {
    return 'Map';
  }
}

/**
 * Persists the map mode to localStorage and broadcasts change to all listeners.
 */
export function setPersistedMapType(mode) {
  try {
    const validMode = mode === 'Satellite' ? 'Satellite' : 'Map';
    localStorage.setItem(MAP_TYPE_KEY, validMode);
    window.dispatchEvent(
      new CustomEvent('geofence_map_type_change', { detail: validMode })
    );
  } catch (e) {
    console.warn('Failed to save map type to localStorage', e);
  }
}

/**
 * Custom React Hook for synchronized map type across all views.
 */
export function usePersistedMapType() {
  const [mapType, setMapTypeState] = useState(getPersistedMapType);

  useEffect(() => {
    const handleChange = (e) => {
      if (e.detail) {
        setMapTypeState(e.detail);
      }
    };

    const handleStorage = (e) => {
      if (e.key === MAP_TYPE_KEY && e.newValue) {
        setMapTypeState(e.newValue);
      }
    };

    window.addEventListener('geofence_map_type_change', handleChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('geofence_map_type_change', handleChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const updateMapType = (newMode) => {
    setPersistedMapType(newMode);
    setMapTypeState(newMode);
  };

  return [mapType, updateMapType];
}

/**
 * Gets last viewed map center from storage/memory.
 */
export function getLastMapCenter() {
  try {
    const saved = localStorage.getItem(MAP_CENTER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.lat && parsed?.lng) return parsed;
    }
  } catch (e) {}
  return DEFAULT_MAP_CENTER;
}

/**
 * Saves last viewed map center.
 */
export function setLastMapCenter(center) {
  try {
    if (center?.lat && center?.lng) {
      localStorage.setItem(MAP_CENTER_KEY, JSON.stringify(center));
    }
  } catch (e) {}
}

/**
 * Gets last viewed map zoom.
 */
export function getLastMapZoom() {
  try {
    const saved = localStorage.getItem(MAP_ZOOM_KEY);
    if (saved) {
      const num = parseInt(saved, 10);
      if (!isNaN(num) && num > 0) return num;
    }
  } catch (e) {}
  return DEFAULT_MAP_ZOOM;
}

/**
 * Saves last viewed map zoom.
 */
export function setLastMapZoom(zoom) {
  try {
    if (typeof zoom === 'number') {
      localStorage.setItem(MAP_ZOOM_KEY, zoom.toString());
    }
  } catch (e) {}
}
