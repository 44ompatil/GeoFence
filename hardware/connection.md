# ESP32 DevKit V1 Hardware Connections & System Architecture

This document provides the complete wiring pinout, hardware connection schematics, component working principles, and test procedures for the **Smart Animal GeoFencing System** adapted for the **ESP32 DevKit V1 (ESP-WROOM-32)**.

---

## 1. Executive Summary & ESP32-S3 Migration

### Why the Change from ESP32-S3 to ESP32 DevKit V1?
The original prototype was designed around an ESP32-S3. Due to hardware damage, it has been replaced with the industry-standard **ESP32 DevKit V1 (30-pin / 36-pin ESP-WROOM-32)**. 

### Key Pinout & Architecture Differences:
| Feature | ESP32-S3 | ESP32 DevKit V1 (WROOM-32) | Selected Project GPIO |
| :--- | :--- | :--- | :--- |
| **Default I2C Bus** | Custom / GPIO 8, 9 | Standard Wire: GPIO 21 (SDA), 22 (SCL) | **SDA: GPIO 21, SCL: GPIO 22** |
| **Secondary Hardware UART** | Configurable up to 48 | Hardware UART2: RX2 = GPIO 16, TX2 = GPIO 17 | **GPS RX: GPIO 16, GPS TX: GPIO 17** |
| **Protected Flash Pins** | Different mapping | **DO NOT USE GPIO 6 to 11** (connected to SPI Flash) | Excluded strictly from design |
| **Strapping / Boot Pins** | GPIO 0, 45, 46 | GPIO 0, 2, 12, 15 (must be free during reset) | Excluded strictly from outputs |
| **ADC Safe Pins** | ADC1 & ADC2 | ADC2 conflicts with Wi-Fi; use **ADC1 only** | **Battery ADC: GPIO 34 (ADC1_CH6)** |

---

## 2. Master Pinout Connection Table

All connections run from the **ESP32 DevKit V1** to the sensors, actuators, and power circuits:

| ESP32 Pin | Component | Component Pin | Signal Type | Voltage / Resistor | Purpose / State |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GPIO 21** | MPU6050 / MPU6500 | **SDA** | I2C Data | 3.3V Logic (Internal pull-up) | 6-axis IMU Motion & Tilt data |
| **GPIO 22** | MPU6050 / MPU6500 | **SCL** | I2C Clock | 3.3V Logic (Internal pull-up) | I2C Clock signal (400 kHz) |
| **GPIO 16 (RX2)**| NEO-6M GPS | **TX** | UART RX | 3.3V Serial (9600 baud) | Receives NMEA stream from GPS |
| **GPIO 17 (TX2)**| NEO-6M GPS | **RX** | UART TX | 3.3V Serial (9600 baud) | Sends config commands to GPS |
| **GPIO 25** | Green LED | **Anode (+)** | Digital OUT | **220Ω Resistor** in series | **SAFE** state indicator |
| **GPIO 26** | Yellow/Blue LED | **Anode (+)** | Digital OUT | **220Ω Resistor** in series | **CAUTION** (Approaching fence) |
| **GPIO 27** | Red LED | **Anode (+)** | Digital OUT | **220Ω Resistor** in series | **HIGH RISK / ESCAPED** breach |
| **GPIO 14** | Buzzer Module | **Positive (+)** | Digital OUT | Direct or via NPN transistor | Audible proximity / escape alarm |
| **GPIO 34** | Battery Voltage | **Divider Point** | Analog IN | 2× 100kΩ voltage divider | Battery % telemetry monitor |
| **VIN (5V) / 3V3**| NEO-6M & MPU | **VCC** | Power | 5V from USB/TP4056 or 3.3V | Sensor Power Supply |
| **GND** | All Components | **GND / Cathode** | Ground | Common Ground Bus | Reference return for all circuits |

---

## 3. Working Principles & Circuit Details

### 3.1 ESP32 DevKit V1 (Main Controller)
* **CPU & Clock:** Dual Xtensa 32-bit LX6 cores operating at 240 MHz.
* **Role:** Acts as the edge-processing brain of the collar. It samples the GPS at 1 Hz, the IMU at 10 Hz, executes the Haversine boundary engine, classifies pet activity, manages the 3-stage risk state machine, drives alert outputs, and outputs JSON telemetry matching the React frontend.
* **Boot Strapping Safeguards:** GPIOs 25, 26, 27, and 14 are chosen specifically because they do not interfere with boot modes, flashing, or SPI flash chips.

### 3.2 MPU6050 / MPU6500 6-Axis Motion Sensor
* **The 6050 vs 6500 Dilemma:**
  Many vendor modules sold as "MPU6050" actually contain the newer **MPU-6500** die.
  * Standard libraries (like `Adafruit_MPU6050`) read register `0x75` (`WHO_AM_I`). If it does not equal `0x68`, they panic and fail.
  * The MPU-6500 returns `0x70`.
  * **Our Solution:** The custom driver in `hardware/include/MPU_Driver.h` reads register `0x75`, detects whether the chip is `0x68` (MPU6050), `0x70` (MPU6500), or `0x71/0x73` (MPU9250/ICM), clears the sleep bit in `PWR_MGMT_1` (register `0x6B`), configures the sample divider and low-pass filter, and reads all 14 data bytes contiguously in a single burst.
* **Dynamic Activity Calculation:**
  Static gravity (1g $\approx 9.81 m/s^2$) is separated from dynamic movement:
  $$\text{Motion Acceleration} = \left|\sqrt{a_x^2 + a_y^2 + a_z^2} - 9.81\right| \text{ m/s}^2$$
  * $< 0.25 \text{ m/s}^2$: **STATIONARY** (pet sleeping or resting)
  * $0.25 - 0.80 \text{ m/s}^2$: **LOW MOVEMENT** (pet walking gently)
  * $0.80 - 1.60 \text{ m/s}^2$: **ACTIVE** (pet playing or trotting)
  * $> 1.60 \text{ m/s}^2$: **HIGH MOVEMENT** (pet sprinting or agitated)

### 3.3 NEO-6M GPS Module
* **UART Communication:** Connected to HardwareSerial(2) on ESP32 (`PIN_GPS_RX = 16`, `PIN_GPS_TX = 17`). Hardware UART uses dedicated hardware FIFO buffers so not a single byte of NMEA data is dropped while the ESP32 performs other calculations.
* **Baud Rate:** Factory default is **9600 baud**.
* **Satellite Lock (PPS Indicator):**
  * When powered on, the module outputs NMEA sentences immediately (`$GPRMC`, `$GPGGA`).
  * If indoors, `satellites == 0` and position is invalid.
  * Near an open window or outdoors, it locks onto 4+ satellites within 30–60 seconds (Cold Start).
  * The tiny onboard red LED (PPS - Pulse Per Second) will start **blinking once every second** when a valid 3D GPS lock is acquired.

### 3.4 Alert Output Module (Triple LEDs & Buzzer)
* **Risk States Aligned with Frontend (`alertEngine.js`):**
  1. **SAFE State:**
     * Condition: Pet is inside the safe boundary with margin $> 15\text{ m}$.
     * Action: **Green LED ON (GPIO 25)**, Yellow/Red OFF, Buzzer silent.
  2. **CAUTION State:**
     * Condition: Pet is within $15\text{ m}$ of boundary (approaching safe zone perimeter).
     * Action: **Yellow/Blue LED ON (GPIO 26)**, Green/Red OFF, Single short warning chirp ($80\text{ ms}$) every 2 seconds.
  3. **HIGH RISK / BOUNDARY BREACH State:**
     * Condition: Pet has crossed outside the safe zone boundary OR is sprinting towards the fence while in caution distance.
     * Action: **Red LED Flashing (GPIO 27)**, Green/Yellow OFF, Continuous pulsing audible alarm ($250\text{ ms}$ ON / $250\text{ ms}$ OFF).
* **LED Protection:** 220Ω resistors limit current to $\approx 6\text{ mA}$ per LED, preventing damage to the ESP32 GPIOs.

### 3.5 Power Circuit (Portable Battery + TP4056)
* **Battery:** Single-cell 3.7V Li-ion (18650 or 500–1200mAh LiPo).
* **TP4056 Module:** Handles constant-current / constant-voltage charging and battery over-discharge protection.
* **Connection:**
  * Battery $(+) \to$ TP4056 `B+`
  * Battery $(-) \to$ TP4056 `B-`
  * TP4056 `OUT+` $\to$ Power Slide Switch $\to$ ESP32 `VIN` (5V pin)
  * TP4056 `OUT-` $\to$ Common GND

---

## 4. Live Sensor Test

The `test_live` environment prints labeled GPS, IMU, and optional battery readings to the Serial Monitor at 115200 baud every second. GPS coordinates are shown only when the GPS has a current fix; this test does not simulate a position.

```text
------------- LIVE SENSOR DATA -------------
GPS: FIX | Satellites: 7
     Latitude: 18.644812 | Longitude: 73.755208
     Speed: 3.5 km/h | Heading: 42.0 deg
IMU: MPU-6500 | Activity: LOW MOVEMENT | Motion: 0.35 m/s^2
     Accel X/Y/Z: 0.10 / 0.20 / 9.80 m/s^2
     Gyro X/Y/Z: 0.0 / 0.1 / 0.0 deg/s | Temp: 25.0 C
Battery: 90% | 3.90 V
--------------------------------------------
```

Without a GPS fix, it reports `GPS: SEARCHING FOR FIX` (or `GPS: NO DATA`) instead of showing a fabricated position. The battery divider on GPIO 34 is optional; the monitor clearly reports when no reading is available.

---

## 5. Step-by-Step Testing & Verification Guide

### 5.1 Unit Test 1: MPU6050 / MPU6500 Sensor Verification
1. Connect ESP32 to computer via USB cable.
2. Build and upload the `test_mpu` environment:
   ```bash
   pio run -e test_mpu -t upload
   ```
3. Open Serial Monitor @ 115200 baud:
   ```bash
   pio device monitor -b 115200
   ```
4. **Expected Output:**
   * Reads WHO_AM_I register (0x75).
   * Identifies if your chip is `MPU-6050` (`0x68`) or `MPU-6500` (`0x70`).
   * Displays live 6-axis acceleration, angular velocity, temperature, and activity status ("STATIONARY", "ACTIVE", etc.).

### 5.2 Unit Test 2: NEO-6M GPS Module Verification
1. Build and upload the `test_gps` environment:
   ```bash
   pio run -e test_gps -t upload
   ```
2. Open Serial Monitor @ 115200 baud:
   ```bash
   pio device monitor -b 115200
   ```
3. **Diagnostic Checks:**
   * Verifies raw NMEA bytes arrive from GPIO 16 (RX2).
   * Displays count of satellites in view.
   * If indoor: Displays `[SEARCHING FOR SATELLITES...]`.
   * Move antenna near an open window or outdoor: Displays `[VALID LOCK - 3D FIX ACTIVE]`, exact latitude/longitude, speed, heading, and distance to home zone.

### 5.3 Unit Test 3: Alert Output Module Verification
1. Build and upload the `test_alerts` environment:
   ```bash
   pio run -e test_alerts -t upload
   ```
2. **Behavior:**
   * Cycles every 3 seconds through:
     * **SAFE:** Green LED ON, Buzzer OFF.
     * **CAUTION:** Yellow LED ON, Single short buzzer chirp.
     * **HIGH RISK:** Red LED flashing, Pulsing alarm tone.

### 5.4 Live Sensor Monitor
1. Build and upload the live-data test environment:
   ```bash
   pio run -e test_live -t upload
   ```
2. Open the Serial Monitor @ 115200 baud:
   ```bash
   pio device monitor -b 115200
   ```
3. **Expected behavior:**
   * Prints live GPS fix/satellite/position/speed, or a clear no-data/searching status.
   * Prints live MPU acceleration, gyroscope, temperature, and activity.
   * Prints battery voltage/estimate when the GPIO 34 divider is connected.

### 5.5 Integration Test: Full System Firmware
1. Build and upload the master firmware:
   ```bash
   pio run -e esp32dev -t upload
   ```
2. Open Serial Monitor @ 115200 baud:
   ```bash
   pio device monitor -b 115200
   ```
3. **Full System Execution:**
   * Power-on self-test flashes all 3 LEDs.
   * MPU auto-detects and initializes.
   * GPS reports its current satellite fix; no simulated coordinates are generated.
   * Haversine boundary engine computes distance and switches Green $\to$ Yellow $\to$ Red LEDs and Buzzer in real time.
   * When configured, telemetry is sent directly to Firebase over authenticated HTTPS every 2 seconds.

---

### 5.6 Dashboard Integration (ESP32 Wi-Fi to Firebase)

The ESP32 sends telemetry directly over Wi-Fi to an authenticated HTTPS Cloud
Function. The function uses a per-device token and a server-side device registry
to update only the paired pet at `users/{uid}/pets/{petId}`. The ESP32 does not
need your Firebase user password, service-account key, serial bridge, or open
Firestore write rules.

1. Deploy the ingestion function from the repository root. Firebase Functions
   deployment requires the Blaze billing plan:
   ```powershell
   cd functions
   npm install
   cd ..
   firebase deploy --only functions:ingestTelemetry --project YOUR_FIREBASE_PROJECT_ID
   ```
2. Pair tracker `GF-2048-ESP32` with a pet in the dashboard. Find your Firebase
   Auth UID and that pet's Firestore document ID under `users/{uid}/pets`.
3. Install the existing Python project dependencies and authenticate the
   provisioning utility with Google Application Default Credentials. For example,
   sign in using `gcloud auth application-default login`, or set
   `GOOGLE_APPLICATION_CREDENTIALS` to a service-account key stored outside this
   repository. Do not commit or share the key:
   ```powershell
   python -m pip install -r requirement.txt
   gcloud auth application-default login
   ```
4. Register the paired device and issue its one-time device token:
   ```powershell
   python hardware\provision_device.py --project-id YOUR_FIREBASE_PROJECT_ID --device-id GF-2048-ESP32 --uid YOUR_AUTH_UID --pet-id YOUR_PET_DOCUMENT_ID
   ```
   Copy the printed token immediately; it cannot be retrieved later. The
   provisioner stores only its SHA-256 hash in `devices/{deviceId}`.
5. Copy `hardware\include\Secrets.example.h` to
   `hardware\include\Secrets.h`. Set your 2.4 GHz Wi-Fi SSID/password, deployed
   function URL, and the token printed by the provisioner in `Secrets.h`. This
   private file is Git-ignored:
   ```powershell
   Copy-Item hardware\include\Secrets.example.h hardware\include\Secrets.h
   ```
   The function URL is `https://asia-south1-YOUR_FIREBASE_PROJECT_ID.cloudfunctions.net/ingestTelemetry`.
6. Build and upload the firmware:
   ```powershell
   pio run -d hardware -e esp32dev -t upload
   ```
7. With the ESP32 powered and connected to Wi-Fi, the dashboard's live Firestore
   listener receives GPS position, heading, speed, battery, activity, and risk
   updates. Wait outdoors or near an open sky-facing window for a GPS fix. Without
   one, the collar reports `hasFix: false`; simulated coordinates are only used
   after an explicit `simulateLocation` command over USB serial.

### Serial software/hardware interface

The firmware uses the software's circular safe-zone shape (`name`, `center`,
`radiusMeters`) and pet telemetry fields (`deviceId`, `status`, `riskLevel`,
`heading`, `speed`, `collarBattery`, `hasFix`, `lat`, `lng`,
`distanceToBoundary`, `motionLevel`, `activity`, `satellites`). The default
hardware geofence is Home Zone at `16.667670504118114, 74.19424365299322`,
with a 10 m radius and 2 m caution buffer. The firmware does not read Firestore
directly; send safe-zone changes as newline-terminated JSON over USB serial at
115200 baud:

```json
{"type":"safeZone","name":"Home Zone","center":{"lat":16.667670504118114,"lng":74.19424365299322},"radiusMeters":10,"warningDistanceMeters":2}
```

For an indoor integration test, send a sample location. This explicitly
switches from GPS to simulation; `useGps` switches back:

```json
{"type":"simulateLocation","lat":16.667670504118114,"lng":74.19424365299322,"speedKmh":0,"courseDeg":0,"satellites":8,"motionLevel":0.1,"activity":"STATIONARY"}
{"type":"useGps"}
```

Each command returns a JSON acknowledgement. Every two seconds the serial
monitor prints the same telemetry JSON body used for HTTPS ingestion; the
backend maps those fields onto the paired pet document. With a simulated fix
at the center, the payload will resemble:

```json
{"deviceId":"GF-2048-ESP32","status":"Safe","riskLevel":"LOW","heading":"N","speed":"0.0 km/h","collarBattery":92,"hasFix":true,"lat":16.667670504118114,"lng":74.19424365299322,"distanceToBoundary":10,"motionLevel":0.1,"activity":"STATIONARY","satellites":8}
```

The nominal thresholds are `Safe` inside 8 m, `Caution` from 8 m through 10 m,
and `High Risk` / `CRITICAL` outside 10 m. GPS accuracy can make readings very
near either threshold vary slightly. The local LEDs and buzzer follow those
states. Safe-zone serial updates are runtime-only; persist matching settings in
the software safe-zone document as well.

The Cloud Function uses the Firebase Admin SDK to update Firestore. Keep the
device token private; rotate it by rerunning the provisioner and reflashing the
device. Never put a Firebase service-account key or Firebase user password in
the firmware.

## 6. Hardware Troubleshooting & Common Gotchas

1. **GPS Not Sending Any Data:**
   * *Cause:* TX and RX lines swapped.
   * *Fix:* Remember: GPS **TX** goes to ESP32 **RX2 (GPIO 16)**. GPS **RX** goes to ESP32 **TX2 (GPIO 17)**.
2. **MPU Sensor Not Found (I2C Error):**
   * *Cause:* Loose jumper or floating AD0 pin.
   * *Fix:* Ensure SDA is on GPIO 21 and SCL is on GPIO 22. If the module has an AD0 pin, connect it to GND to guarantee address `0x68`.
3. **GPS Has No Satellite Fix Indoors:**
   * *Cause:* GPS signals (1.5 GHz) cannot penetrate thick concrete roofs and walls.
   * *Fix:* Place the ceramic patch antenna facing the sky near a window or outdoor balcony. The onboard red PPS LED will start blinking when locked. The `test_live` environment reports when it has no GPS fix and does not simulate a position.
4. **ESP32 Fails to Upload Firmware:**
   * *Cause:* Bootloader timing or strapping pin conflict.
   * *Fix:* Hold down the **BOOT** (or IO0) button on the ESP32 board when PlatformIO says `Connecting........_____`, then release it once flashing starts.
