# GeoFence
A virtual fence for domestic animals and their tracking

## Hardware collar (ESP32)

The collar firmware is in [`hardware/`](./hardware/). It runs on an ESP32
DevKit V1 and reads the GPS, motion sensor, and optional battery voltage,
evaluates the pet's position against a circular safe zone, drives the status
LEDs and buzzer, and emits telemetry for the frontend.

### Hardware inputs

- **NEO-6M GPS** on UART2 (GPIO 16/17): latitude, longitude, speed, course,
  and satellite count. A fresh GPS fix is required for a real location update.
- **MPU-6050/MPU-6500** on I2C (GPIO 21/22): motion level and activity
  classification.
- **Optional battery voltage divider** on GPIO 34: collar battery percentage.
- **Software/test input** on USB serial at 115200 baud: newline-terminated JSON
  commands can configure the safe zone or explicitly enable a simulated
  location for indoor testing.

The default Home Zone center is `16.667670504118114, 74.19424365299322`, with a
10 m radius and a 2 m caution buffer. Inside the buffer the collar reports
`Safe`; near the perimeter it reports `Caution`; outside the radius it reports
`High Risk` / `CRITICAL`. Simulation is opt-in and does not replace GPS by
default.

### Hardware outputs and software integration

- **Green LED:** Safe; **yellow LED:** Caution; **red LED and buzzer:**
  High Risk / escaped.
- **USB serial:** command acknowledgements and the telemetry JSON body every
  two seconds, useful for testing the frontend data contract.
- **Wi-Fi HTTPS:** when configured with Wi-Fi credentials and a provisioned
  device token, sends the same telemetry to the authenticated ingestion
  endpoint, which updates the paired pet for the frontend.

Telemetry uses the backend/frontend field names: `deviceId`, `status`,
`riskLevel`, `heading`, `speed`, `collarBattery`, and `hasFix`. With a GPS fix,
it also includes `lat`, `lng`, `distanceToBoundary`, `motionLevel`, `activity`,
and `satellites`.

Example serial commands (send each line at 115200 baud):

```json
{"type":"safeZone","name":"Home Zone","center":{"lat":16.667670504118114,"lng":74.19424365299322},"radiusMeters":10,"warningDistanceMeters":2}
{"type":"simulateLocation","lat":16.667670504118114,"lng":74.19424365299322,"speedKmh":0,"courseDeg":0,"satellites":8,"motionLevel":0.1,"activity":"STATIONARY"}
{"type":"useGps"}
```

See [`hardware/connection.md`](./hardware/connection.md) for wiring, firmware
build/upload instructions, device provisioning, and the complete serial and
telemetry examples.
