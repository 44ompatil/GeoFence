const hasValidCoordinates = (pet) =>
  Number.isFinite(pet?.lat) &&
  Number.isFinite(pet?.lng) &&
  pet.lat >= -90 &&
  pet.lat <= 90 &&
  pet.lng >= -180 &&
  pet.lng <= 180;

/**
 * Returns a renderable location only for an explicit fix or a previously
 * timestamped fix that has since gone stale. Untimestamped legacy coordinates
 * are not trusted as a pet location.
 */
export function getPetLocationState(pet) {
  if (!hasValidCoordinates(pet)) {
    return { status: "waiting", coordinates: null };
  }

  const coordinates = { lat: pet.lat, lng: pet.lng };
  if (pet.hasFix === true) {
    return { status: "live", coordinates };
  }
  if (pet.gpsTimestamp) {
    return { status: "stale", coordinates };
  }
  return { status: "waiting", coordinates: null };
}
