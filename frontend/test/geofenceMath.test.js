import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateHaversineDistanceMeters,
  classifyCircularSafeZoneDistance,
} from "../src/utils/geofenceMath.js";

const center = { lat: 18.6435, lng: 73.7549 };
const radiusMeters = 100;
const warningMeters = 15;

function pointAtEastwardDistance(meters) {
  return {
    lat: center.lat,
    lng:
      center.lng + meters / (111320 * Math.cos((center.lat * Math.PI) / 180)),
  };
}

test("safe-zone interior is SAFE and keeps the breach buzzer off", () => {
  const point = pointAtEastwardDistance(40);
  const distance = calculateHaversineDistanceMeters(
    center.lat,
    center.lng,
    point.lat,
    point.lng,
  );
  assert.equal(
    classifyCircularSafeZoneDistance(distance, radiusMeters, warningMeters),
    "SAFE",
  );
});

test("warning buffer near the configured radius is APPROACHING", () => {
  const point = pointAtEastwardDistance(92);
  const distance = calculateHaversineDistanceMeters(
    center.lat,
    center.lng,
    point.lat,
    point.lng,
  );
  assert.equal(
    classifyCircularSafeZoneDistance(distance, radiusMeters, warningMeters),
    "APPROACHING",
  );
});

test("position beyond the configured radius is a BREACH", () => {
  const point = pointAtEastwardDistance(120);
  const distance = calculateHaversineDistanceMeters(
    center.lat,
    center.lng,
    point.lat,
    point.lng,
  );
  assert.equal(
    classifyCircularSafeZoneDistance(distance, radiusMeters, warningMeters),
    "BREACH",
  );
});

test("invalid zone configuration cannot classify a location as a breach", () => {
  assert.equal(classifyCircularSafeZoneDistance(120, 0, 15), "NO_CONFIG");
  assert.equal(classifyCircularSafeZoneDistance(120, 100, 100), "NO_CONFIG");
});
