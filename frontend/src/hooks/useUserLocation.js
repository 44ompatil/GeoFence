import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to retrieve, observe, and on-demand request the current user's browser location.
 * Gracefully handles permission denial, timeouts, or unavailability.
 */
export function useUserLocation() {
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const watchIdRef = useRef(null);

  // Request browser location on demand (e.g. when crosshair clicked or initial mount)
  const requestCurrentLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const errMsg = 'Geolocation is not supported by your browser.';
        setLocationError(errMsg);
        reject(new Error(errMsg));
        return;
      }

      setIsLocating(true);
      setLocationError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(coords);
          setIsLocating(false);
          setLocationError(null);
          resolve(coords);
        },
        (error) => {
          setIsLocating(false);
          let msg = 'Unable to retrieve location.';
          if (error.code === error.PERMISSION_DENIED) {
            msg = 'Location permission was denied in browser settings.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            msg = 'Location information is unavailable.';
          } else if (error.code === error.TIMEOUT) {
            msg = 'Location request timed out.';
          }
          setLocationError(msg);
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 15000,
        }
      );
    });
  }, []);

  // Initial passive attempt & live movement watcher
  useEffect(() => {
    if (!navigator.geolocation) return;

    // Passive fetch on mount
    requestCurrentLocation().catch(() => {
      // Ignore initial passive error without blocking
    });

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError(null);
        },
        () => {},
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 10000,
        }
      );
    } catch (e) {}

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [requestCurrentLocation]);

  return { userLocation, isLocating, locationError, requestCurrentLocation };
}
