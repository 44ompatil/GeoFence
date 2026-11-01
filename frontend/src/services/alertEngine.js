import { createAlert } from './firestore/alerts.js';

/**
 * Calculates real-world geographic distance between two coordinates in meters
 * using the Haversine formula.
 */
export function calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return 0;
  }
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Ray-casting algorithm to test if a point (lat, lng) is inside a polygon.
 */
export function isPointInsidePolygon(point, polygonPoints) {
  if (!polygonPoints || polygonPoints.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
    const xi = polygonPoints[i].lat ?? polygonPoints[i].latitude;
    const yi = polygonPoints[i].lng ?? polygonPoints[i].longitude;
    const xj = polygonPoints[j].lat ?? polygonPoints[j].latitude;
    const yj = polygonPoints[j].lng ?? polygonPoints[j].longitude;

    const intersect =
      yi > point.lng !== yj > point.lng &&
      point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Parses numeric distance in meters from strings like '15 m', '20m', '30' or numbers.
 */
function parseDistanceMeters(val, fallback = 15) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) return parsed;
  }
  return fallback;
}

/**
 * Evaluates a pet's position against a safe zone.
 * Returns: { state: 'SAFE' | 'APPROACHING' | 'OUTSIDE', distanceToBoundary: number, zoneName: string }
 */
export function evaluatePetZoneStatus(pet, zone, defaultWarningDist = 15) {
  if (!pet || pet.lat === undefined || pet.lng === undefined || !zone) {
    return { state: 'SAFE', distanceToBoundary: 0, zoneName: zone?.name || 'Safe Zone' };
  }

  const petLat = parseFloat(pet.lat);
  const petLng = parseFloat(pet.lng);
  const warningDistance = parseDistanceMeters(zone.warningDistance || defaultWarningDist, 15);

  if (zone.type === 'polygon' && zone.polygonPoints?.length >= 3) {
    const isInside = isPointInsidePolygon({ lat: petLat, lng: petLng }, zone.polygonPoints);
    if (!isInside) {
      return { state: 'OUTSIDE', distanceToBoundary: 0, zoneName: zone.name };
    }
    // If inside polygon
    return { state: 'SAFE', distanceToBoundary: warningDistance + 10, zoneName: zone.name };
  } else {
    // Circular zone
    const centerLat = parseFloat(zone.center?.lat ?? zone.lat ?? 0);
    const centerLng = parseFloat(zone.center?.lng ?? zone.lng ?? 0);
    const radiusMeters = parseFloat(zone.radiusMeters || zone.radius || 100);

    const distToCenter = calculateHaversineDistanceMeters(petLat, petLng, centerLat, centerLng);
    const distToBoundary = radiusMeters - distToCenter; // positive when inside, negative when outside

    if (distToCenter > radiusMeters) {
      return {
        state: 'OUTSIDE',
        distanceToBoundary: Math.round(distToCenter - radiusMeters),
        zoneName: zone.name,
      };
    } else if (distToBoundary <= warningDistance) {
      return {
        state: 'APPROACHING',
        distanceToBoundary: Math.round(distToBoundary),
        zoneName: zone.name,
      };
    } else {
      return {
        state: 'SAFE',
        distanceToBoundary: Math.round(distToBoundary),
        zoneName: zone.name,
      };
    }
  }
}

// In-memory state tracking to prevent alert spamming and only fire on transitions
const petEvaluationHistory = new Map();

/**
 * Evaluates all real pets against real safe zones and settings.
 * Creates Firestore alerts only on genuine state transitions.
 */
export async function evaluatePetsAndGenerateAlerts({
  uid,
  pets = [],
  safeZones = [],
  settings = {},
}) {
  if (!uid || !pets || pets.length === 0) return;

  const notificationsSettings = settings?.notifications || {};
  const warningDist = parseDistanceMeters(settings?.tracking?.boundaryWarningDistance, 15);

  for (const pet of pets) {
    const petId = pet.id;
    if (!petId) continue;

    const prevEvaluation = petEvaluationHistory.get(petId) || {
      boundaryState: 'SAFE',
      batteryLow: false,
      isOffline: false,
      highRisk: false,
      initialized: false,
    };

    // Find relevant safe zones for this pet
    // (either assigned specifically or general active zones)
    const applicableZones = safeZones.filter((zone) => {
      if (zone.assignedPets && Array.isArray(zone.assignedPets) && zone.assignedPets.length > 0) {
        return zone.assignedPets.includes(petId) || zone.assignedPets.includes(pet.name);
      }
      return true; // if no specific assignment, applies to all
    });

    let currentBoundaryState = 'SAFE';
    let triggeredZone = null;
    let distFromBoundary = 0;

    if (applicableZones.length > 0) {
      for (const zone of applicableZones) {
        const result = evaluatePetZoneStatus(pet, zone, warningDist);
        if (result.state === 'OUTSIDE') {
          currentBoundaryState = 'OUTSIDE';
          triggeredZone = zone;
          distFromBoundary = result.distanceToBoundary;
          break; // OUTSIDE takes highest priority
        } else if (result.state === 'APPROACHING' && currentBoundaryState !== 'OUTSIDE') {
          currentBoundaryState = 'APPROACHING';
          triggeredZone = zone;
          distFromBoundary = result.distanceToBoundary;
        }
      }
    }

    // 1. Check Boundary Breach Transition
    if (currentBoundaryState === 'OUTSIDE' && prevEvaluation.boundaryState !== 'OUTSIDE') {
      if (notificationsSettings.boundaryBreach !== false) {
        await createAlert(uid, {
          petId: pet.id,
          petName: pet.name,
          petColor: pet.color,
          type: 'BOUNDARY_BREACH',
          severity: 'CRITICAL',
          title: 'Boundary Breach',
          event: 'Boundary Breach',
          message: `${pet.name} has left safe zone "${triggeredZone?.name || 'Designated Zone'}"!`,
          zone: triggeredZone?.name || 'Designated Zone',
          zoneId: triggeredZone?.id || '',
          distanceFromBoundary: distFromBoundary,
        });
      }
    }
    // 2. Check Approaching Boundary Transition
    else if (
      currentBoundaryState === 'APPROACHING' &&
      prevEvaluation.boundaryState === 'SAFE'
    ) {
      if (notificationsSettings.approachingBoundary !== false) {
        await createAlert(uid, {
          petId: pet.id,
          petName: pet.name,
          petColor: pet.color,
          type: 'APPROACHING_BOUNDARY',
          severity: 'CAUTION',
          title: 'Approaching Boundary',
          event: 'Approaching Boundary',
          message: `${pet.name} is approaching the boundary (${distFromBoundary}m remaining).`,
          zone: triggeredZone?.name || 'Designated Zone',
          zoneId: triggeredZone?.id || '',
          distanceFromBoundary: distFromBoundary,
        });
      }
    }

    // 3. Check Low Battery Transition
    const currentBattery = pet.collarBattery ?? pet.battery;
    const isBatteryLow = typeof currentBattery === 'number' && currentBattery <= 20;
    if (isBatteryLow && !prevEvaluation.batteryLow) {
      if (notificationsSettings.lowBattery !== false) {
        await createAlert(uid, {
          petId: pet.id,
          petName: pet.name,
          petColor: pet.color,
          type: 'LOW_BATTERY',
          severity: 'CAUTION',
          title: 'Low Battery',
          event: 'Low Battery',
          message: `${pet.name}'s tracker battery is low (${currentBattery}%).`,
          zone: triggeredZone?.name || 'Safe Zone',
        });
      }
    }

    // 4. Check Device Offline Transition
    const hasTracker = Boolean(pet.deviceId || pet.trackerId);
    const isOffline = hasTracker && (pet.status === 'Offline' || pet.isOffline === true);
    if (isOffline && !prevEvaluation.isOffline) {
      if (notificationsSettings.deviceOffline !== false) {
        await createAlert(uid, {
          petId: pet.id,
          petName: pet.name,
          petColor: pet.color,
          type: 'DEVICE_OFFLINE',
          severity: 'HIGH RISK',
          title: 'Device Offline',
          event: 'Device Offline',
          message: `${pet.name}'s tracker has not checked in.`,
          zone: triggeredZone?.name || 'Safe Zone',
        });
      }
    }

    // 5. Check High Risk Movement Transition
    const isHighRisk = pet.riskLevel === 'High' || pet.status === 'High Risk';
    if (isHighRisk && !prevEvaluation.highRisk) {
      if (notificationsSettings.highRiskMovement !== false) {
        await createAlert(uid, {
          petId: pet.id,
          petName: pet.name,
          petColor: pet.color,
          type: 'HIGH_RISK_MOVEMENT',
          severity: 'HIGH RISK',
          title: 'High-Risk Movement',
          event: 'High-Risk Movement',
          message: `Unusual speed or trajectory detected for ${pet.name}.`,
          zone: triggeredZone?.name || 'Safe Zone',
        });
      }
    }

    // Update history for this pet
    petEvaluationHistory.set(petId, {
      boundaryState: currentBoundaryState,
      batteryLow: isBatteryLow,
      isOffline: isOffline,
      highRisk: isHighRisk,
      initialized: true,
    });
  }
}

/**
 * Resets evaluation cache (e.g., on logout).
 */
export function resetAlertEngineState() {
  petEvaluationHistory.clear();
}
