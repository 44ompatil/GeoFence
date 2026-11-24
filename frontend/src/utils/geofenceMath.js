export function calculateHaversineDistanceMeters(lat1, lng1, lat2, lng2) {
  const coordinates = [lat1, lng1, lat2, lng2].map(Number);
  if (!coordinates.every(Number.isFinite)) return 0;
  const [nLat1, nLng1, nLat2, nLng2] = coordinates;
  if (
    nLat1 < -90 ||
    nLat1 > 90 ||
    nLat2 < -90 ||
    nLat2 > 90 ||
    nLng1 < -180 ||
    nLng1 > 180 ||
    nLng2 < -180 ||
    nLng2 > 180
  )
    return 0;

  const earthRadiusMeters = 6371000;
  const radians = Math.PI / 180;
  const dLat = (nLat2 - nLat1) * radians;
  const dLng = (nLng2 - nLng1) * radians;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(nLat1 * radians) *
      Math.cos(nLat2 * radians) *
      Math.sin(dLng / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function classifyCircularSafeZoneDistance(
  distanceMeters,
  radiusMeters,
  warningMeters,
) {
  if (
    !Number.isFinite(distanceMeters) ||
    !Number.isFinite(radiusMeters) ||
    !Number.isFinite(warningMeters) ||
    radiusMeters <= 0 ||
    warningMeters < 0 ||
    warningMeters >= radiusMeters
  ) {
    return "NO_CONFIG";
  }
  if (distanceMeters > radiusMeters) return "BREACH";
  if (radiusMeters - distanceMeters <= warningMeters) return "APPROACHING";
  return "SAFE";
}
