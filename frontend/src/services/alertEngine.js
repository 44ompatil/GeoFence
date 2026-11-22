import { createAlert } from './firestore/alerts.js';

/**
 * Calculates real-world geographic distance between two coordinates in meters
 * using the Haversine formula.
 */
export function calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  if (
    lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined ||
    lat1 === null || lon1 === null || lat2 === null || lon2 === null
  ) {
    return 0;
  }
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);
  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || nLon2 === null || isNaN(nLon2)) {
    return 0;
  }

  const R = 6371000; // Earth's radius in meters
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLon = ((nLon2 - nLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Helper to compute distance in meters from point P to line segment AB
 * in a local tangent plane approximation.
 */
function distanceToSegmentMeters(p, a, b) {
  const lat0 = p.lat;
  const cosLat = Math.cos((lat0 * Math.PI) / 180);
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * cosLat;

  const ax = (a.lng - p.lng) * mPerDegLng;
  const ay = (a.lat - p.lat) * mPerDegLat;
  const bx = (b.lng - p.lng) * mPerDegLng;
  const by = (b.lat - p.lat) * mPerDegLat;

  const dx = bx - ax;
  const dy = by - ay;
  const segLenSq = dx * dx + dy * dy;

  if (segLenSq === 0) {
    return Math.sqrt(ax * ax + ay * ay);
  }

  // Projection parameter t of vector AP onto vector AB
  const t = Math.max(0, Math.min(1, (-ax * dx - ay * dy) / segLenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;

  return Math.sqrt(projX * projX + projY * projY);
}

/**
 * Computes the minimum distance from a point to the perimeter of a polygon in meters.
 */
export function distanceToPolygonBoundaryMeters(point, polygonPoints) {
  if (!polygonPoints || polygonPoints.length < 2) return 0;
  let minDistance = Infinity;

  const p = { lat: Number(point.lat), lng: Number(point.lng) };

  for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
    const a = {
      lat: Number(polygonPoints[j].lat ?? polygonPoints[j].latitude),
      lng: Number(polygonPoints[j].lng ?? polygonPoints[j].longitude),
    };
    const b = {
      lat: Number(polygonPoints[i].lat ?? polygonPoints[i].latitude),
      lng: Number(polygonPoints[i].lng ?? polygonPoints[i].longitude),
    };
    const dist = distanceToSegmentMeters(p, a, b);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return minDistance === Infinity ? 0 : minDistance;
}

/**
 * Ray-casting algorithm to test if a point (lat, lng) is inside a polygon.
 */
export function isPointInsidePolygon(point, polygonPoints) {
  if (!polygonPoints || polygonPoints.length < 3) return false;

  let inside = false;
  const pLat = Number(point.lat);
  const pLng = Number(point.lng);

  for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
    const xi = Number(polygonPoints[i].lat ?? polygonPoints[i].latitude);
    const yi = Number(polygonPoints[i].lng ?? polygonPoints[i].longitude);
    const xj = Number(polygonPoints[j].lat ?? polygonPoints[j].latitude);
    const yj = Number(polygonPoints[j].lng ?? polygonPoints[j].longitude);

    const intersect =
      yi > pLng !== yj > pLng &&
      pLat < ((xj - xi) * (pLng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Parses numeric distance in meters from strings like '15 m', '20m', '30' or numbers.
 */
function parseDistanceMeters(val, fallback = 15) {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) return parsed;
  }
  return fallback;
}

/**
 * Strict safeguard: Verifies whether a pet has legitimate, valid GPS coordinates.
 * Returns false for null/undefined coordinates, NaN, out-of-bounds, uninitialized 0,0,
 * explicit hasFix: false (lost lock), or coordinates marked as fallback.
 */
export function hasValidPetLocation(pet) {
  if (!pet) return false;
  if (pet.lat === null || pet.lat === undefined || pet.lng === null || pet.lng === undefined) {
    return false;
  }
  const lat = typeof pet.lat === 'number' ? pet.lat : parseFloat(pet.lat);
  const lng = typeof pet.lng === 'number' ? pet.lng : parseFloat(pet.lng);
  if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  // Uninitialized GPS stream
  if (lat === 0 && lng === 0) return false;
  // If collar explicitly reports no GPS fix
  if (pet.hasFix === false) return false;
  // Fallback / simulated flag safeguard
  if (pet.isFallback === true) return false;

  return true;
}

/**
 * Generates a unique signature representing the current boundary definition of a safe zone.
 * If the zone's center, radius, polygon vertices, or update timestamp change, the signature changes.
 */
export function getZoneSignature(zone) {
  if (!zone) return '';
  const pts = Array.isArray(zone.polygonPoints)
    ? zone.polygonPoints.map((p) => `${Number(p.lat).toFixed(6)},${Number(p.lng).toFixed(6)}`).join(';')
    : '';
  const lat = Number(zone.center?.lat ?? zone.lat ?? 0).toFixed(6);
  const lng = Number(zone.center?.lng ?? zone.lng ?? 0).toFixed(6);
  const radius = Number(zone.radiusMeters || parseFloat(zone.radius) || 0).toFixed(1);
  const shape = (zone.shape || (pts ? 'Polygon' : 'Circle')).toLowerCase();
  const warning = parseDistanceMeters(zone.warningDistance, 15);
  const updated = zone.updatedAt?.toMillis?.() || zone.updatedAt?.seconds || '';
  return `${zone.id || ''}_${shape}_${lat}_${lng}_${radius}_${pts}_${warning}_${updated}`;
}

/**
 * Evaluates a pet's position against a safe zone.
 * Supports both Circular and Polygon safe zones as well as Restricted / Danger Perimeters.
 *
 * Returns: { state: 'SAFE' | 'APPROACHING' | 'OUTSIDE' | 'NO_LOCATION', distanceToBoundary: number, zoneName: string, zoneId: string }
 */
export function evaluatePetZoneStatus(pet, zone, defaultWarningDist = 15) {
  if (!hasValidPetLocation(pet) || !zone) {
    return {
      state: 'NO_LOCATION',
      distanceToBoundary: 0,
      zoneName: zone?.name || 'Safe Zone',
      zoneId: zone?.id || '',
    };
  }

  const petLat = parseFloat(pet.lat);
  const petLng = parseFloat(pet.lng);
  const warningDistance = parseDistanceMeters(zone.warningDistance || defaultWarningDist, 15);

  // Check shape and type carefully to resolve any mismatch (e.g. zone.shape === 'Polygon' vs zone.type)
  const isPolygon =
    zone.shape?.toLowerCase() === 'polygon' ||
    zone.type?.toLowerCase() === 'polygon' ||
    (Array.isArray(zone.polygonPoints) && zone.polygonPoints.length >= 3);

  const isRestricted =
    zone.status === 'Restricted' ||
    zone.type === 'Danger Perimeter' ||
    zone.type === 'Restricted';

  if (isPolygon) {
    const isInside = isPointInsidePolygon({ lat: petLat, lng: petLng }, zone.polygonPoints);
    const distToEdge = Math.round(
      distanceToPolygonBoundaryMeters({ lat: petLat, lng: petLng }, zone.polygonPoints)
    );

    if (isRestricted) {
      // Danger Perimeter: being INSIDE is a breach
      if (isInside) {
        return {
          state: 'OUTSIDE',
          distanceToBoundary: distToEdge,
          zoneName: zone.name,
          zoneId: zone.id,
          isRestricted: true,
        };
      } else if (distToEdge <= warningDistance) {
        return {
          state: 'APPROACHING',
          distanceToBoundary: distToEdge,
          zoneName: zone.name,
          zoneId: zone.id,
          isRestricted: true,
        };
      } else {
        return {
          state: 'SAFE',
          distanceToBoundary: distToEdge,
          zoneName: zone.name,
          zoneId: zone.id,
          isRestricted: true,
        };
      }
    } else {
      // Normal Safe Zone: being OUTSIDE is a breach
      if (!isInside) {
        return {
          state: 'OUTSIDE',
          distanceToBoundary: distToEdge,
          zoneName: zone.name,
          zoneId: zone.id,
        };
      } else if (distToEdge <= warningDistance) {
        return {
          state: 'APPROACHING',
          distanceToBoundary: distToEdge,
          zoneName: zone.name,
          zoneId: zone.id,
        };
      } else {
        return {
          state: 'SAFE',
          distanceToBoundary: distToEdge,
          zoneName: zone.name,
          zoneId: zone.id,
        };
      }
    }
  } else {
    // Circular zone
    const centerLat = parseFloat(zone.center?.lat ?? zone.lat ?? 0);
    const centerLng = parseFloat(zone.center?.lng ?? zone.lng ?? 0);
    const radiusMeters = parseFloat(zone.radiusMeters || zone.radius || 50);

    const distToCenter = calculateHaversineDistanceMeters(petLat, petLng, centerLat, centerLng);
    const distToBoundary = radiusMeters - distToCenter; // positive when inside, negative when outside

    if (isRestricted) {
      // Danger Perimeter: inside circle = breach
      if (distToCenter <= radiusMeters) {
        return {
          state: 'OUTSIDE',
          distanceToBoundary: Math.round(distToCenter),
          zoneName: zone.name,
          zoneId: zone.id,
          isRestricted: true,
        };
      } else if (distToCenter - radiusMeters <= warningDistance) {
        return {
          state: 'APPROACHING',
          distanceToBoundary: Math.round(distToCenter - radiusMeters),
          zoneName: zone.name,
          zoneId: zone.id,
          isRestricted: true,
        };
      } else {
        return {
          state: 'SAFE',
          distanceToBoundary: Math.round(distToCenter - radiusMeters),
          zoneName: zone.name,
          zoneId: zone.id,
          isRestricted: true,
        };
      }
    } else {
      // Standard circular safe zone
      if (distToCenter > radiusMeters) {
        return {
          state: 'OUTSIDE',
          distanceToBoundary: Math.round(distToCenter - radiusMeters),
          zoneName: zone.name,
          zoneId: zone.id,
        };
      } else if (distToBoundary <= warningDistance) {
        return {
          state: 'APPROACHING',
          distanceToBoundary: Math.round(distToBoundary),
          zoneName: zone.name,
          zoneId: zone.id,
        };
      } else {
        return {
          state: 'SAFE',
          distanceToBoundary: Math.round(distToBoundary),
          zoneName: zone.name,
          zoneId: zone.id,
        };
      }
    }
  }
}

// In-memory state tracking to prevent alert spamming and track state transitions per pet
const petEvaluationHistory = new Map();

/**
 * Evaluates all real pets against their applicable safe zones and user settings.
 * Creates Firestore alerts on genuine state transitions, immediate zone creation/modification,
 * and calls onNewAlert for in-app popup notifications.
 */
export async function evaluatePetsAndGenerateAlerts({
  uid,
  pets = [],
  safeZones = [],
  settings = {},
  alerts = [],
  onNewAlert = null,
}) {
  if (!uid || !pets || pets.length === 0) return;

  const notificationsSettings = settings?.notifications || {};
  const warningDist = parseDistanceMeters(settings?.tracking?.boundaryWarningDistance, 15);

  for (const pet of pets) {
    const petId = pet.id;
    if (!petId) continue;

    const prevEvaluation = petEvaluationHistory.get(petId) || {
      boundaryState: 'UNINITIALIZED',
      breachedZoneId: null,
      zoneSignature: null,
      batteryLow: false,
      isOffline: false,
      highRisk: false,
      initialized: false,
    };

    // 1. Safeguard: Do not evaluate pets without valid coordinates or with lost GPS fix
    if (!hasValidPetLocation(pet)) {
      petEvaluationHistory.set(petId, {
        ...prevEvaluation,
        boundaryState: 'NO_LOCATION',
        initialized: true,
      });
      continue;
    }

    // 2. Find applicable safe zones respecting explicit pet-to-zone assignment
    const applicableZones = safeZones.filter((zone) => {
      if (zone.status === 'Inactive' || zone.disabled === true) return false;

      // Check explicit assignedPets array (IDs or names)
      if (Array.isArray(zone.assignedPets) && zone.assignedPets.length > 0) {
        const isAssigned = zone.assignedPets.some(
          (assigned) => assigned === petId || assigned === pet.name
        );
        if (isAssigned) return true;
      }

      // Check matching zone name on pet profile
      if (pet.zone && zone.name && pet.zone.trim().toLowerCase() === zone.name.trim().toLowerCase()) {
        return true;
      }

      // If zone has no explicit assignments and pet has no specific zone, apply as general zone
      if (
        (!zone.assignedPets || zone.assignedPets.length === 0) &&
        (!pet.zone || pet.zone === 'Home Zone' || pet.zone === 'Designated Zone')
      ) {
        return true;
      }

      return false;
    });

    // If no safe zones are configured/assigned for this pet, do not generate false boundary breach
    if (applicableZones.length === 0) {
      petEvaluationHistory.set(petId, {
        ...prevEvaluation,
        boundaryState: 'NO_ZONE',
        breachedZoneId: null,
        zoneSignature: null,
        initialized: true,
      });
      continue;
    }

    // 3. Multi-zone evaluation:
    // For standard safe zones: pet is SAFE if inside AT LEAST ONE assigned safe zone.
    // For restricted zones: pet breaches if INSIDE any danger perimeter.
    let insideAnySafeZone = false;
    let closestApproaching = null;
    const outsideStandardZones = [];
    const breachedRestrictedZones = [];

    for (const zone of applicableZones) {
      const result = evaluatePetZoneStatus(pet, zone, warningDist);
      const isRestricted = zone.status === 'Restricted' || zone.type === 'Danger Perimeter';

      if (isRestricted) {
        if (result.state === 'OUTSIDE') {
          breachedRestrictedZones.push({ zone, result });
        } else if (result.state === 'APPROACHING') {
          if (!closestApproaching || result.distanceToBoundary < closestApproaching.result.distanceToBoundary) {
            closestApproaching = { zone, result };
          }
        }
      } else {
        if (result.state === 'SAFE') {
          insideAnySafeZone = true;
        } else if (result.state === 'APPROACHING') {
          if (!closestApproaching || result.distanceToBoundary < closestApproaching.result.distanceToBoundary) {
            closestApproaching = { zone, result };
          }
        } else if (result.state === 'OUTSIDE') {
          outsideStandardZones.push({ zone, result });
        }
      }
    }

    const standardSafeZones = applicableZones.filter(
      (z) => z.status !== 'Restricted' && z.type !== 'Danger Perimeter'
    );

    let currentBoundaryState = 'SAFE';
    let triggeredZone = null;
    let distFromBoundary = 0;

    // Restricted zone breach takes top priority
    if (breachedRestrictedZones.length > 0) {
      currentBoundaryState = 'OUTSIDE';
      triggeredZone = breachedRestrictedZones[0].zone;
      distFromBoundary = breachedRestrictedZones[0].result.distanceToBoundary;
    } else if (standardSafeZones.length > 0) {
      if (insideAnySafeZone) {
        currentBoundaryState = 'SAFE';
      } else if (outsideStandardZones.length === standardSafeZones.length) {
        // Outside ALL designated safe zones
        currentBoundaryState = 'OUTSIDE';
        triggeredZone = outsideStandardZones[0].zone;
        distFromBoundary = outsideStandardZones[0].result.distanceToBoundary;
      } else if (closestApproaching) {
        currentBoundaryState = 'APPROACHING';
        triggeredZone = closestApproaching.zone;
        distFromBoundary = closestApproaching.result.distanceToBoundary;
      }
    }

    const currentZoneSignature = getZoneSignature(triggeredZone);

    // 4. Check if an active (unresolved) boundary breach alert already exists in Firestore
    const hasActiveBreachInFirestore = alerts.some(
      (a) =>
        !a.resolved &&
        a.petId === petId &&
        a.type === 'BOUNDARY_BREACH' &&
        (a.zoneId === triggeredZone?.id || a.zone === triggeredZone?.name)
    );

    // 5. Evaluate Boundary Breach Alert Condition
    // A breach alert is triggered if:
    // - Pet is OUTSIDE its safe zone
    // - AND there is no active breach alert already in Firestore
    // - AND (this is a fresh transition from SAFE/APPROACHING OR the safe zone definition/boundaries changed)
    const isNewBreachTransition =
      currentBoundaryState === 'OUTSIDE' &&
      !hasActiveBreachInFirestore &&
      (prevEvaluation.boundaryState !== 'OUTSIDE' ||
        prevEvaluation.breachedZoneId !== triggeredZone?.id ||
        prevEvaluation.zoneSignature !== currentZoneSignature);

    if (isNewBreachTransition) {
      if (notificationsSettings.boundaryBreach !== false) {
        const breachMsg =
          distFromBoundary > 0
            ? `${pet.name} has left safe zone "${triggeredZone?.name || 'Designated Zone'}" (${distFromBoundary}m outside)!`
            : `${pet.name} has left safe zone "${triggeredZone?.name || 'Designated Zone'}"!`;

        const newAlertData = {
          petId: pet.id,
          petName: pet.name,
          petColor: pet.color,
          type: 'BOUNDARY_BREACH',
          severity: 'CRITICAL',
          title: 'Boundary Breach',
          event: 'Boundary Breach',
          message: breachMsg,
          zone: triggeredZone?.name || 'Designated Zone',
          zoneId: triggeredZone?.id || '',
          distanceFromBoundary: distFromBoundary,
        };

        const createRes = await createAlert(uid, newAlertData);
        if (createRes.success && createRes.alert && onNewAlert) {
          onNewAlert(createRes.alert);
        }
      }
    }
    // 6. Evaluate Approaching Boundary Transition
    else if (
      currentBoundaryState === 'APPROACHING' &&
      prevEvaluation.boundaryState === 'SAFE'
    ) {
      const hasActiveApproachAlert = alerts.some(
        (a) =>
          !a.resolved &&
          a.petId === petId &&
          a.type === 'APPROACHING_BOUNDARY' &&
          (a.zoneId === triggeredZone?.id || a.zone === triggeredZone?.name)
      );

      if (!hasActiveApproachAlert && notificationsSettings.approachingBoundary !== false) {
        const approachMsg = `${pet.name} is approaching the boundary of "${triggeredZone?.name || 'Designated Zone'}" (${distFromBoundary}m remaining).`;

        const newAlertData = {
          petId: pet.id,
          petName: pet.name,
          petColor: pet.color,
          type: 'APPROACHING_BOUNDARY',
          severity: 'CAUTION',
          title: 'Approaching Boundary',
          event: 'Approaching Boundary',
          message: approachMsg,
          zone: triggeredZone?.name || 'Designated Zone',
          zoneId: triggeredZone?.id || '',
          distanceFromBoundary: distFromBoundary,
        };

        const createRes = await createAlert(uid, newAlertData);
        if (createRes.success && createRes.alert && onNewAlert) {
          onNewAlert(createRes.alert);
        }
      }
    }

    // 7. Check Low Battery Transition
    const currentBattery = pet.collarBattery ?? pet.battery;
    const isBatteryLow = typeof currentBattery === 'number' && currentBattery <= 20;
    if (isBatteryLow && !prevEvaluation.batteryLow) {
      if (notificationsSettings.lowBattery !== false) {
        const createRes = await createAlert(uid, {
          petId: pet.id,
          petName: pet.name,
          petColor: pet.color,
          type: 'LOW_BATTERY',
          severity: 'CAUTION',
          title: 'Low Battery',
          event: 'Low Battery',
          message: `${pet.name}'s tracker battery is low (${currentBattery}%).`,
          zone: triggeredZone?.name || pet.zone || 'Safe Zone',
        });
        if (createRes.success && createRes.alert && onNewAlert) {
          onNewAlert(createRes.alert);
        }
      }
    }

    // 8. Check Device Offline Transition
    const hasTracker = Boolean(pet.deviceId || pet.trackerId);
    const isOffline = hasTracker && (pet.status === 'Offline' || pet.isOffline === true);
    if (isOffline && !prevEvaluation.isOffline) {
      if (notificationsSettings.deviceOffline !== false) {
        const createRes = await createAlert(uid, {
          petId: pet.id,
          petName: pet.name,
          petColor: pet.color,
          type: 'DEVICE_OFFLINE',
          severity: 'HIGH RISK',
          title: 'Device Offline',
          event: 'Device Offline',
          message: `${pet.name}'s tracker has not checked in.`,
          zone: triggeredZone?.name || pet.zone || 'Safe Zone',
        });
        if (createRes.success && createRes.alert && onNewAlert) {
          onNewAlert(createRes.alert);
        }
      }
    }

    // 9. Check High Risk Movement Transition
    const isHighRisk =
      pet.riskLevel === 'High' ||
      pet.riskLevel === 'HIGH' ||
      pet.riskLevel === 'CRITICAL' ||
      pet.status === 'High Risk' ||
      pet.status === 'Escaped';

    if (isHighRisk && !prevEvaluation.highRisk && currentBoundaryState !== 'OUTSIDE') {
      if (notificationsSettings.highRiskMovement !== false) {
        const createRes = await createAlert(uid, {
          petId: pet.id,
          petName: pet.name,
          petColor: pet.color,
          type: 'HIGH_RISK_MOVEMENT',
          severity: 'HIGH RISK',
          title: 'High-Risk Movement',
          event: 'High-Risk Movement',
          message: `Unusual speed or rapid boundary approach detected for ${pet.name}.`,
          zone: triggeredZone?.name || pet.zone || 'Safe Zone',
        });
        if (createRes.success && createRes.alert && onNewAlert) {
          onNewAlert(createRes.alert);
        }
      }
    }

    // Update history for this pet
    // When currentBoundaryState returns to 'SAFE', breachedZoneId and zoneSignature clear,
    // so any subsequent breach will fire a new alert cleanly.
    petEvaluationHistory.set(petId, {
      boundaryState: currentBoundaryState,
      breachedZoneId: currentBoundaryState === 'OUTSIDE' ? triggeredZone?.id : null,
      zoneSignature: currentBoundaryState === 'OUTSIDE' ? currentZoneSignature : null,
      batteryLow: isBatteryLow,
      isOffline: isOffline,
      highRisk: isHighRisk,
      initialized: true,
    });
  }
}

/**
 * Resets evaluation cache (e.g., on logout or clear all).
 */
export function resetAlertEngineState() {
  petEvaluationHistory.clear();
}

