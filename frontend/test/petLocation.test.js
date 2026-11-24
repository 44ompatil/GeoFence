import test from "node:test";
import assert from "node:assert/strict";
import { getPetLocationState } from "../src/utils/petLocation.js";

test("no GPS fix hides untrusted legacy coordinates", () => {
  assert.deepEqual(
    getPetLocationState({ lat: 18.6435, lng: 73.7549, hasFix: false }),
    { status: "waiting", coordinates: null },
  );
});

test("a confirmed GPS fix is rendered as current", () => {
  assert.deepEqual(
    getPetLocationState({ lat: 12.5, lng: 45.25, hasFix: true }),
    { status: "live", coordinates: { lat: 12.5, lng: 45.25 } },
  );
});

test("loss of fix retains a timestamped position as stale", () => {
  assert.deepEqual(
    getPetLocationState({
      lat: 12.5,
      lng: 45.25,
      hasFix: false,
      gpsTimestamp: { seconds: 1 },
    }),
    { status: "stale", coordinates: { lat: 12.5, lng: 45.25 } },
  );
});

test("a new fix replaces the stale marker coordinates", () => {
  assert.deepEqual(
    getPetLocationState({
      lat: 12.6,
      lng: 45.3,
      hasFix: true,
      gpsTimestamp: { seconds: 2 },
    }),
    { status: "live", coordinates: { lat: 12.6, lng: 45.3 } },
  );
});

test("invalid coordinates are never rendered", () => {
  assert.deepEqual(getPetLocationState({ lat: 91, lng: 181, hasFix: true }), {
    status: "waiting",
    coordinates: null,
  });
});
