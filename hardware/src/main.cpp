/**
 * ============================================================================
 * SMART ANIMAL GEOFENCING SYSTEM - FIRMWARE
 * Target Board: ESP32 DevKit V1 (ESP-WROOM-32)
 *
 * Integrated Components:
 *   1. MPU-6050 / MPU-6500 (Auto-detected 6-axis IMU) on I2C (GPIO 21, 22)
 *   2. NEO-6M GPS Module on Hardware UART2 (GPIO 16 RX, GPIO 17 TX)
 *   3. Triple Status LEDs: Green (GPIO 25), Yellow (GPIO 26), Red (GPIO 27)
 *   4. Audible Alert Buzzer (GPIO 14)
 *   5. Battery Voltage Sensing on ADC1 (GPIO 34)
 *   6. Real-time Decision & Risk Engine (Haversine boundary + IMU fusion)
 *   7. Telemetry Engine: Authenticated HTTPS telemetry over Wi-Fi
 * ============================================================================
 */

#include <Arduino.h>
#include <Wire.h>
#include <HardwareSerial.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <TinyGPSPlus.h>
#include <ArduinoJson.h>
#include <string.h>
#include <time.h>

#include "Config.h"
#include "MPU_Driver.h"
#include "GeoUtils.h"

// ----------------------------------------------------------------------------
// GLOBAL OBJECTS & SENSORS
// ----------------------------------------------------------------------------
HardwareSerial gpsSerial(2);
TinyGPSPlus gps;
UniversalMPU imu;

// Runtime state variables
MpuData currentMpuData;
double currentLat = DEFAULT_SAFE_LAT;
double currentLng = DEFAULT_SAFE_LNG;
double currentSpeedKmH = 0.0;
double currentCourseDeg = 0.0;
String currentHeading = "N";
bool hasGpsFix = false;
int satellitesCount = 0;
int batteryPercent = 90;

// Geofence risk state
RiskState currentRisk = RISK_SAFE;
float distanceToCenter = 0.0f;
float distanceToBoundary = DEFAULT_RADIUS_METERS;
double safeZoneLat = DEFAULT_SAFE_LAT;
double safeZoneLng = DEFAULT_SAFE_LNG;
float safeZoneRadiusMeters = DEFAULT_RADIUS_METERS;
float safeZoneWarningMeters = DEFAULT_WARNING_METERS;
String safeZoneName = DEFAULT_SAFE_ZONE;

bool simulationMode = false;
char serialLineBuffer[512];
size_t serialLineLength = 0;
bool serialLineOverflow = false;

// Non-blocking timer timestamps
unsigned long lastImuSampleMs = 0;
unsigned long lastTelemetryMs = 0;
unsigned long lastBuzzerToggleMs = 0;
bool buzzerState = false;

unsigned long lastWifiRetryMs = 0;
bool wifiStarted = false;
bool clockSyncRequested = false;
bool wifiConfigWarningPrinted = false;

static const char* FIREBASE_ROOT_CA = R"PEM(
-----BEGIN CERTIFICATE-----
MIIFVzCCAz+gAwIBAgINAgPlk28xsBNJiGuiFzANBgkqhkiG9w0BAQwFADBHMQsw
CQYDVQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZpY2VzIExMQzEU
MBIGA1UEAxMLR1RTIFJvb3QgUjEwHhcNMTYwNjIyMDAwMDAwWhcNMzYwNjIyMDAw
MDAwWjBHMQswCQYDVQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZp
Y2VzIExMQzEUMBIGA1UEAxMLR1RTIFJvb3QgUjEwggIiMA0GCSqGSIb3DQEBAQUA
A4ICDwAwggIKAoICAQC2EQKLHuOhd5s73L+UPreVp0A8of2C+X0yBoJx9vaMf/vo
27xqLpeXo4xL+Sv2sfnOhB2x+cWX3u+58qPpvBKJXqeqUqv4IyfLpLGcY9vXmX7w
Cl7raKb0xlpHDU0QM+NOsROjyBhsS+z8CZDfnWQpJSMHobTSPS5g4M/SCYe7zUjw
TcLCeoiKu7rPWRnWr4+wB7CeMfGCwcDfLqZtbBkOtdh+JhpFAz2weaSUKK0Pfybl
qAj+lug8aJRT7oM6iCsVlgmy4HqMLnXWnOunVmSPlk9orj2XwoSPwLxAwAtcvfaH
szVsrBhQf4TgTM2S0yDpM7xSma8ytSmzJSq0SPly4cpk9+aCEI3oncKKiPo4Zor8
Y/kB+Xj9e1x3+naH+uzfsQ55lVe0vSbv1gHR6xYKu44LtcXFilWr06zqkUspzBmk
MiVOKvFlRNACzqrOSbTqn3yDsEB750Orp2yjj32JgfpMpf/VjsPOS+C12LOORc92
wO1AK/1TD7Cn1TsNsYqiA94xrcx36m97PtbfkSIS5r762DL8EGMUUXLeXdYWk70p
aDPvOmbsB4om3xPXV2V4J95eSRQAogB/mqghtqmxlbCluQ0WEdrHbEg8QOB+DVrN
VjzRlwW5y0vtOUucxD/SVRNuJLDWcfr0wbrM7Rv1/oFB2ACYPTrIrnqYNxgFlQID
AQABo0IwQDAOBgNVHQ8BAf8EBAMCAYYwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4E
FgQU5K8rJnEaK0gnhS9SZizv8IkTcT4wDQYJKoZIhvcNAQEMBQADggIBAJ+qQibb
C5u+/x6Wki4+omVKapi6Ist9wTrYggoGxval3sBOh2Z5ofmmWJyq+bXmYOfg6LEe
QkEzCzc9zolwFcq1JKjPa7XSQCGYzyI0zzvFIoTgxQ6KfF2I5DUkzps+GlQebtuy
h6f88/qBVRRiClmpIgUxPoLW7ttXNLwzldMXG+gnoot7TiYaelpkttGsN/H9oPM4
7HLwEXWdyzRSjeZ2axfG34arJ45JK3VmgRAhpuo+9K4l/3wV3s6MJT/KYnAK9y8J
ZgfIPxz88NtFMN9iiMG1D53Dn0reWVlHxYciNuaCp+0KueIHoI17eko8cdLiA6Ef
MgfdG+RCzgwARWGAtQsgWSl4vflVy2PFPEz0tv/bal8xa5meLMFrUKTX5hgUvYU/
Z6tGn6D/Qqc6f1zLXbBwHSs09dR2CQzreExZBfMzQsNhFRAbd03OIozUhfJFfbdT
6u9AWpQKXCBfTkBdYiJ23//OYb2MI3jSNwLgjt7RETeJ9r/tSQdirpLsQBqvFAnZ
0E6yove+7u7Y/9waLd64NnHi/Hm3lCXRSHNboTXns5lndcEZOitHTtNCjv0xyBZm
2tIMPNuzjsmhDYAPexZ3FL//2wmUspO8IFgV6dtxQ/PeEMMA3KgqlbbC1j+Qa3bb
bP6MvPJwNQzcmRk13NfIRmPVNnGuV/u3gm3c
-----END CERTIFICATE-----
)PEM";

// ----------------------------------------------------------------------------
// HARDWARE INITIALIZATION
// ----------------------------------------------------------------------------
void initPins() {
    pinMode(PIN_LED_GREEN, OUTPUT);
    pinMode(PIN_LED_YELLOW, OUTPUT);
    pinMode(PIN_LED_RED, OUTPUT);
    pinMode(PIN_BUZZER, OUTPUT);

    // Initial output state
    digitalWrite(PIN_LED_GREEN, LOW);
    digitalWrite(PIN_LED_YELLOW, LOW);
    digitalWrite(PIN_LED_RED, LOW);
    digitalWrite(PIN_BUZZER, LOW);
}

void initSensors() {
    Serial.println("\n[SETUP] Initializing MPU6050 / MPU6500 IMU...");
    if (imu.begin(PIN_I2C_SDA, PIN_I2C_SCL)) {
        Serial.printf("[SETUP] IMU Online! Model: %s (WHO_AM_I: 0x%02X @ 0x%02X)\n",
            imu.getChipName(), imu.getWhoAmI(), imu.getAddress());
    } else {
        Serial.println("[SETUP - WARN] IMU not responding on I2C. Check SDA:21, SCL:22.");
    }

    Serial.println("[SETUP] Initializing NEO-6M GPS on Hardware UART2 (RX:16, TX:17)...");
    gpsSerial.begin(GPS_BAUD_RATE, SERIAL_8N1, PIN_GPS_RX, PIN_GPS_TX);
}

// ----------------------------------------------------------------------------
// BATTERY VOLTAGE CALCULATION
// ----------------------------------------------------------------------------
int readBatteryPercentage() {
    // Read raw ADC on GPIO 34 (ADC1_CH6)
    int rawAdc = analogRead(PIN_BATTERY_ADC);
    if (rawAdc < 100) {
        // Not connected or running via USB 5V -> Return healthy nominal 92%
        return 92;
    }

    // Standard 2x 100k voltage divider: V_batt = ADC_V * 2
    // ESP32 ADC: 0-4095 corresponds to ~0-3.3V
    float pinVoltage = (rawAdc / 4095.0f) * 3.3f;
    float batteryVoltage = pinVoltage * 2.0f;

    // Linear percentage map: 3.2V (0%) to 4.2V (100%)
    if (batteryVoltage <= BATTERY_MIN_V) return 5;
    if (batteryVoltage >= BATTERY_MAX_V) return 100;
    int pct = (int)(((batteryVoltage - BATTERY_MIN_V) / (BATTERY_MAX_V - BATTERY_MIN_V)) * 100.0f);
    return constrain(pct, 0, 100);
}

// ----------------------------------------------------------------------------
// SOFTWARE CONFIGURATION / SERIAL TEST INPUT
// ----------------------------------------------------------------------------
void printCommandAck(const char* command, bool ok, const char* message) {
    JsonDocument response;
    response["type"] = "ack";
    response["command"] = command;
    response["ok"] = ok;
    response["message"] = message;

    String payload;
    serializeJson(response, payload);
    Serial.println(payload);
}

bool isValidCoordinate(double lat, double lng) {
    return isfinite(lat) && isfinite(lng) &&
        lat >= -90.0 && lat <= 90.0 &&
        lng >= -180.0 && lng <= 180.0;
}

void handleSerialCommand(const char* line) {
    JsonDocument command;
    DeserializationError error = deserializeJson(command, line);
    if (error) {
        printCommandAck("unknown", false, "Invalid JSON command");
        return;
    }

    const char* type = command["type"] | "";

    if (strcmp(type, "safeZone") == 0 || strcmp(type, "config") == 0) {
        double lat = NAN;
        double lng = NAN;
        if (command["center"]["lat"].is<double>()) {
            lat = command["center"]["lat"].as<double>();
        } else if (command["lat"].is<double>()) {
            lat = command["lat"].as<double>();
        }
        if (command["center"]["lng"].is<double>()) {
            lng = command["center"]["lng"].as<double>();
        } else if (command["lng"].is<double>()) {
            lng = command["lng"].as<double>();
        }

        const double radius = command["radiusMeters"] | NAN;
        const double warning = command["warningDistanceMeters"] | safeZoneWarningMeters;
        const char* name = command["name"] | DEFAULT_SAFE_ZONE;
        if (!isValidCoordinate(lat, lng) || !isfinite(radius) ||
            radius <= 0.0 || radius > 100000.0 ||
            !isfinite(warning) || warning < 0.0 || warning >= radius ||
            strlen(name) > 64) {
            printCommandAck(type, false, "Invalid center, radius, or warning distance");
            return;
        }

        safeZoneLat = lat;
        safeZoneLng = lng;
        safeZoneRadiusMeters = (float)radius;
        safeZoneWarningMeters = (float)warning;
        safeZoneName = name;
        printCommandAck(type, true, "Safe zone updated");
        return;
    }

    if (strcmp(type, "simulateLocation") == 0) {
        const double lat = command["lat"] | NAN;
        const double lng = command["lng"] | NAN;
        const double speed = command["speedKmh"] | 0.0;
        const double course = command["courseDeg"] | 0.0;
        const double motion = command["motionLevel"] | 0.0;
        const int satellites = command["satellites"] | 8;
        const char* activity = command["activity"] | "STATIONARY";
        if (!isValidCoordinate(lat, lng) || !isfinite(speed) || speed < 0.0 ||
            !isfinite(course) || course < 0.0 || course > 360.0 ||
            !isfinite(motion) || motion < 0.0 || motion > 100.0 ||
            satellites < 0 || satellites > 100 || strlen(activity) > 32) {
            printCommandAck(type, false, "Invalid simulated location, speed, or course");
            return;
        }

        currentLat = lat;
        currentLng = lng;
        currentSpeedKmH = speed;
        currentCourseDeg = course;
        currentHeading = GeoUtils::courseToCardinal(course);
        satellitesCount = satellites;
        currentMpuData.motionAcceleration = (float)motion;
        currentMpuData.activity = activity;
        hasGpsFix = true;
        simulationMode = true;
        printCommandAck(type, true, "Simulated location enabled; send useGps to return to GPS");
        return;
    }

    if (strcmp(type, "useGps") == 0) {
        simulationMode = false;
        printCommandAck(type, true, "GPS input enabled");
        return;
    }

    printCommandAck(type, false, "Supported types: safeZone, simulateLocation, useGps");
}

void processSerialInput() {
    while (Serial.available() > 0) {
        const char c = (char)Serial.read();
        if (c == '\r') continue;

        if (c == '\n') {
            if (serialLineOverflow) {
                printCommandAck("unknown", false, "Command exceeds 511 bytes");
            } else if (serialLineLength > 0) {
                serialLineBuffer[serialLineLength] = '\0';
                handleSerialCommand(serialLineBuffer);
            }
            serialLineLength = 0;
            serialLineOverflow = false;
            continue;
        }

        if (serialLineLength < sizeof(serialLineBuffer) - 1) {
            serialLineBuffer[serialLineLength++] = c;
        } else {
            serialLineOverflow = true;
        }
    }
}

// ----------------------------------------------------------------------------
// RISK DECISION ENGINE & SENSOR FUSION
// ----------------------------------------------------------------------------
void updateRiskEngine() {
    if (!hasGpsFix) {
        currentRisk = RISK_SAFE;
        distanceToCenter = 0.0f;
        distanceToBoundary = safeZoneRadiusMeters;
        return;
    }

    // Evaluate boundary with Haversine
    currentRisk = GeoUtils::evaluateRisk(
        currentLat, currentLng,
        safeZoneLat, safeZoneLng,
        safeZoneRadiusMeters, safeZoneWarningMeters,
        distanceToCenter, distanceToBoundary
    );

    // Sensor Fusion: Escalate if pet is near boundary AND running at high speed
    if (currentRisk == RISK_CAUTION) {
        bool isRunning = (currentMpuData.activity == "HIGH MOVEMENT") || (currentSpeedKmH > 7.0);
        if (isRunning && distanceToBoundary < (safeZoneWarningMeters * 0.6f)) {
            // Rapid trajectory towards fence -> Pre-emptive escalation to HIGH RISK
            currentRisk = RISK_HIGH_RISK;
        }
    }
}

// ----------------------------------------------------------------------------
// ACTUATOR / ALERT OUTPUTS CONTROLLER
// ----------------------------------------------------------------------------
void updateAlertOutputs() {
    unsigned long now = millis();

    if (!hasGpsFix) {
        digitalWrite(PIN_LED_GREEN, LOW);
        digitalWrite(PIN_LED_YELLOW, LOW);
        digitalWrite(PIN_LED_RED, LOW);
        digitalWrite(PIN_BUZZER, LOW);
        buzzerState = false;
        return;
    }

    switch (currentRisk) {
        case RISK_SAFE:
            digitalWrite(PIN_LED_GREEN, HIGH);
            digitalWrite(PIN_LED_YELLOW, LOW);
            digitalWrite(PIN_LED_RED, LOW);
            digitalWrite(PIN_BUZZER, LOW);
            buzzerState = false;
            break;

        case RISK_CAUTION:
            // Yellow LED Solid, Subtle periodic buzzer chirp every 2 seconds
            digitalWrite(PIN_LED_GREEN, LOW);
            digitalWrite(PIN_LED_YELLOW, HIGH);
            digitalWrite(PIN_LED_RED, LOW);

            if (now - lastBuzzerToggleMs >= 2000) {
                lastBuzzerToggleMs = now;
                digitalWrite(PIN_BUZZER, HIGH);
                delay(80); // Short chirp
                digitalWrite(PIN_BUZZER, LOW);
            }
            break;

        case RISK_HIGH_RISK:
        case RISK_ESCAPED:
            // Red LED Blinking + Pulsing Alarm Tone
            digitalWrite(PIN_LED_GREEN, LOW);
            digitalWrite(PIN_LED_YELLOW, LOW);

            if (now - lastBuzzerToggleMs >= 250) {
                lastBuzzerToggleMs = now;
                buzzerState = !buzzerState;
                digitalWrite(PIN_LED_RED, buzzerState ? HIGH : LOW);
                digitalWrite(PIN_BUZZER, buzzerState ? HIGH : LOW);
            }
            break;
    }
}

// ----------------------------------------------------------------------------
// FIREBASE AUTH — EMAIL/PASSWORD SIGN-IN (no Cloud Functions, no Python needed)
// ----------------------------------------------------------------------------
// The ESP32 signs in directly with the owner's Firebase Auth credentials.
// At boot: email+password → ID token + refresh token via identitytoolkit REST.
// Every 55 minutes: the ID token is auto-refreshed via securetoken REST.
// All Firestore writes use the live ID token.  Works on Spark (free) plan.
// ----------------------------------------------------------------------------

static String firebaseIdToken    = "";
static String firebaseRefreshTok = "";
static unsigned long lastTokenRefreshMs = 0;
static bool tokenBootstrapped = false;

// Sign in with email + password.
// POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=API_KEY
bool signInWithEmailPassword() {
    if (strlen(GEOFENCE_FIREBASE_API_KEY) == 0 || strlen(GEOFENCE_AUTH_EMAIL) == 0) {
        Serial.println("[Auth] Set GEOFENCE_FIREBASE_API_KEY and GEOFENCE_AUTH_EMAIL in Secrets.h.");
        return false;
    }

    WiFiClientSecure secureClient;
    secureClient.setCACert(FIREBASE_ROOT_CA);

    HTTPClient http;
    http.setTimeout(8000);
    String url = String("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=")
                 + GEOFENCE_FIREBASE_API_KEY;
    if (!http.begin(secureClient, url)) {
        Serial.println("[Auth] Failed to begin sign-in request.");
        return false;
    }

    http.addHeader("Content-Type", "application/json");
    JsonDocument req;
    req["email"]             = GEOFENCE_AUTH_EMAIL;
    req["password"]          = GEOFENCE_AUTH_PASSWORD;
    req["returnSecureToken"] = true;
    String body;
    serializeJson(req, body);

    int code = http.POST(body);
    String resp = http.getString();
    http.end();

    if (code != 200) {
        Serial.printf("[Auth] Sign-in failed (%d): %s\n", code, resp.c_str());
        return false;
    }

    JsonDocument respDoc;
    if (deserializeJson(respDoc, resp) != DeserializationError::Ok) {
        Serial.println("[Auth] Failed to parse sign-in response.");
        return false;
    }

    firebaseIdToken    = respDoc["idToken"].as<String>();
    firebaseRefreshTok = respDoc["refreshToken"].as<String>();
    lastTokenRefreshMs = millis();
    tokenBootstrapped  = true;
    Serial.println("[Auth] Signed in to Firebase successfully.");
    return true;
}

// Refresh an expired ID token using the stored refresh token.
// POST https://securetoken.googleapis.com/v1/token?key=API_KEY
bool refreshIdToken() {
    if (firebaseRefreshTok.isEmpty()) return false;

    WiFiClientSecure secureClient;
    secureClient.setCACert(FIREBASE_ROOT_CA);

    HTTPClient http;
    http.setTimeout(8000);
    String url = String("https://securetoken.googleapis.com/v1/token?key=")
                 + GEOFENCE_FIREBASE_API_KEY;
    if (!http.begin(secureClient, url)) {
        Serial.println("[Auth] Failed to begin token refresh request.");
        return false;
    }

    http.addHeader("Content-Type", "application/x-www-form-urlencoded");
    String body = "grant_type=refresh_token&refresh_token=" + firebaseRefreshTok;

    int code = http.POST(body);
    String resp = http.getString();
    http.end();

    if (code != 200) {
        Serial.printf("[Auth] Token refresh failed (%d): %s\n", code, resp.c_str());
        return false;
    }

    JsonDocument respDoc;
    if (deserializeJson(respDoc, resp) != DeserializationError::Ok) {
        Serial.println("[Auth] Failed to parse token refresh response.");
        return false;
    }

    firebaseIdToken    = respDoc["id_token"].as<String>();
    firebaseRefreshTok = respDoc["refresh_token"].as<String>();
    lastTokenRefreshMs = millis();
    Serial.println("[Auth] Firebase ID token refreshed.");
    return true;
}

// Ensure we have a valid token.  Call before every telemetry write.
bool ensureValidToken() {
    if (!tokenBootstrapped) {
        return signInWithEmailPassword();
    }
    // Refresh 5 minutes before the 60-minute expiry
    if (millis() - lastTokenRefreshMs >= 55UL * 60UL * 1000UL) {
        return refreshIdToken();
    }
    return true;
}

// ----------------------------------------------------------------------------
// WIFI AND HTTPS TELEMETRY  (Firestore REST — no Cloud Functions required)
// ----------------------------------------------------------------------------
// Telemetry is PATCH-ed directly to the pet document via the Firestore REST
// API.  The URL is built from GEOFENCE_PROJECT_ID, GEOFENCE_OWNER_UID, and
// GEOFENCE_PET_ID defined in Secrets.h.
// ----------------------------------------------------------------------------

void startWifi() {
    if (strlen(GEOFENCE_WIFI_SSID) == 0 || strlen(GEOFENCE_WIFI_PASSWORD) == 0) {
        if (!wifiConfigWarningPrinted) {
            Serial.println("[WiFi] Configure SSID and password in include/Secrets.h.");
            wifiConfigWarningPrinted = true;
        }
        return;
    }

    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.begin(GEOFENCE_WIFI_SSID, GEOFENCE_WIFI_PASSWORD);
    wifiStarted = true;
    lastWifiRetryMs = millis();
    Serial.printf("[WiFi] Connecting to %s...\n", GEOFENCE_WIFI_SSID);
}

void maintainWifi() {
    if (!wifiStarted || WiFi.status() == WL_CONNECTED) return;

    unsigned long now = millis();
    if (now - lastWifiRetryMs >= 15000) {
        lastWifiRetryMs = now;
        Serial.println("[WiFi] Reconnecting...");
        WiFi.reconnect();
    }
}

// Build a Firestore REST PATCH body from the current telemetry state.
// Only the fields that the firmware owns are sent; all other pet fields
// (name, breed, photo, etc.) are left untouched by the PATCH.
// See: https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/patch
String buildFirestorePatchBody() {
    JsonDocument doc;
    JsonObject fields = doc["fields"].to<JsonObject>();

    // Helper lambdas for Firestore typed value objects
    auto strVal = [&](JsonObject parent, const char* key, const String& val) {
        parent[key]["stringValue"] = val;
    };
    auto intVal = [&](JsonObject parent, const char* key, int val) {
        parent[key]["integerValue"] = val;
    };
    auto dblVal = [&](JsonObject parent, const char* key, double val) {
        parent[key]["doubleValue"] = val;
    };
    auto boolVal = [&](JsonObject parent, const char* key, bool val) {
        parent[key]["booleanValue"] = val;
    };

    strVal(fields, "deviceId", String(DEVICE_ID));
    strVal(fields, "status",   String(GeoUtils::riskStateToString(currentRisk)));
    strVal(fields, "riskLevel", String(GeoUtils::riskLevelToFrontend(currentRisk)));
    strVal(fields, "heading",  currentHeading);

    char speedBuf[16];
    snprintf(speedBuf, sizeof(speedBuf), "%0.1f km/h", currentSpeedKmH);
    strVal(fields, "speed", String(speedBuf));

    intVal(fields, "collarBattery", batteryPercent);
    boolVal(fields, "hasFix", hasGpsFix);

    if (hasGpsFix) {
        dblVal(fields, "lat", currentLat);
        dblVal(fields, "lng", currentLng);
        dblVal(fields, "distanceToBoundary", round(distanceToBoundary * 10.0) / 10.0);
        dblVal(fields, "motionLevel", round(currentMpuData.motionAcceleration * 100.0) / 100.0);
        strVal(fields, "activity", String(currentMpuData.activity));
        intVal(fields, "satellites", satellitesCount);
    }

    String payload;
    serializeJson(doc, payload);
    return payload;
}

// Build a simple JSON payload for the Serial monitor (unchanged format)
String buildTelemetryPayload() {
    JsonDocument doc;
    doc["deviceId"] = DEVICE_ID;
    doc["status"]   = GeoUtils::riskStateToString(currentRisk);
    doc["riskLevel"]= GeoUtils::riskLevelToFrontend(currentRisk);
    doc["heading"]  = currentHeading;

    char speedBuf[16];
    snprintf(speedBuf, sizeof(speedBuf), "%0.1f km/h", currentSpeedKmH);
    doc["speed"] = speedBuf;

    doc["collarBattery"] = batteryPercent;
    doc["hasFix"]        = hasGpsFix;

    if (hasGpsFix) {
        doc["lat"]               = currentLat;
        doc["lng"]               = currentLng;
        doc["distanceToBoundary"]= round(distanceToBoundary * 10.0) / 10.0;
        doc["motionLevel"]       = round(currentMpuData.motionAcceleration * 100.0) / 100.0;
        doc["activity"]          = currentMpuData.activity;
        doc["satellites"]        = satellitesCount;
    }

    String payload;
    serializeJson(doc, payload);
    return payload;
}

// PATCH telemetry fields directly into the Firestore pet document.
// Uses the Firestore REST API with the Firebase ID token for auth.
void transmitTelemetry(const String& serialPayload) {
    if (!wifiStarted || WiFi.status() != WL_CONNECTED) return;

    if (strlen(GEOFENCE_FIREBASE_API_KEY) == 0 || strlen(GEOFENCE_AUTH_EMAIL) == 0
        || strlen(GEOFENCE_OWNER_UID) == 0 || strlen(GEOFENCE_PET_ID) == 0) {
        Serial.println("[HTTPS] Configure Firebase credentials in include/Secrets.h.");
        return;
    }

    time_t currentTime = time(nullptr);
    if (currentTime < 1700000000) {
        if (!clockSyncRequested) {
            configTime(0, 0, "pool.ntp.org", "time.google.com");
            clockSyncRequested = true;
            Serial.println("[WiFi] Waiting for network time before HTTPS verification.");
        }
        return;
    }

    // Ensure we have a valid Firebase ID token
    if (!ensureValidToken()) {
        Serial.println("[Auth] No valid Firebase token; skipping telemetry upload.");
        return;
    }

    // Build Firestore PATCH URL from Secrets.h components.
    // Append updateMask.fieldPaths for every field we write so we don't
    // accidentally erase other pet fields (name, photo, breed, etc.).
    String patchUrl = String("https://firestore.googleapis.com/v1/projects/")
        + GEOFENCE_PROJECT_ID
        + "/databases/(default)/documents/users/"
        + GEOFENCE_OWNER_UID
        + "/pets/"
        + GEOFENCE_PET_ID
        + "?updateMask.fieldPaths=deviceId"
        + "&updateMask.fieldPaths=status"
        + "&updateMask.fieldPaths=riskLevel"
        + "&updateMask.fieldPaths=heading"
        + "&updateMask.fieldPaths=speed"
        + "&updateMask.fieldPaths=collarBattery"
        + "&updateMask.fieldPaths=hasFix";
    if (hasGpsFix) {
        patchUrl += "&updateMask.fieldPaths=lat"
                    "&updateMask.fieldPaths=lng"
                    "&updateMask.fieldPaths=distanceToBoundary"
                    "&updateMask.fieldPaths=motionLevel"
                    "&updateMask.fieldPaths=activity"
                    "&updateMask.fieldPaths=satellites";
    }

    WiFiClientSecure secureClient;
    secureClient.setCACert(FIREBASE_ROOT_CA);

    HTTPClient request;
    request.setTimeout(8000);
    if (!request.begin(secureClient, patchUrl)) {
        Serial.println("[HTTPS] Failed to initialize Firestore PATCH request.");
        return;
    }

    request.addHeader("Content-Type", "application/json");
    request.addHeader("Authorization", "Bearer " + firebaseIdToken);
    request.addHeader("X-HTTP-Method-Override", "PATCH");   // some TLS stacks need this

    String firestoreBody = buildFirestorePatchBody();
    // Use PATCH via sendRequest since HTTPClient::PATCH is not always available
    int responseCode = request.sendRequest("PATCH", firestoreBody);

    if (responseCode >= 200 && responseCode < 300) {
        Serial.printf("[HTTPS] Firestore telemetry accepted (%d).\n", responseCode);
    } else {
        Serial.printf("[HTTPS] Firestore telemetry failed (%d): %s\n",
            responseCode,
            responseCode > 0 ? request.getString().c_str()
                              : request.errorToString(responseCode).c_str());
        // If 401/403, force token re-bootstrap on next cycle
        if (responseCode == 401 || responseCode == 403) {
            tokenBootstrapped = false;
            firebaseIdToken    = "";
            firebaseRefreshTok = "";
            Serial.println("[Auth] Token invalidated — will re-authenticate on next cycle.");
        }
    }
    request.end();
}

// ----------------------------------------------------------------------------
// ARDUINO SETUP
// ----------------------------------------------------------------------------
void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n=======================================================");
    Serial.println("  SMART ANIMAL GEOFENCING COLLAR - ESP32 DEVKIT V1");
    Serial.println("=======================================================");

    initPins();
    initSensors();
    startWifi();

    Serial.printf("[CONFIG] Safe zone \"%s\": center %.14f, %.14f; radius %.1f m; warning %.1f m\n",
        safeZoneName.c_str(), safeZoneLat, safeZoneLng,
        safeZoneRadiusMeters, safeZoneWarningMeters);
    Serial.println("[SERIAL] Send one JSON command per line at 115200 baud.");

    // Power-on self test: flash all LEDs in sequence
    digitalWrite(PIN_LED_GREEN, HIGH); delay(200); digitalWrite(PIN_LED_GREEN, LOW);
    digitalWrite(PIN_LED_YELLOW, HIGH); delay(200); digitalWrite(PIN_LED_YELLOW, LOW);
    digitalWrite(PIN_LED_RED, HIGH); delay(200); digitalWrite(PIN_LED_RED, LOW);

    Serial.println("[SETUP] Hardware ready. Entering real-time monitoring loop.\n");
}

// ----------------------------------------------------------------------------
// ARDUINO MAIN LOOP
// ----------------------------------------------------------------------------
void loop() {
    processSerialInput();

    // 1. Ingest GPS NMEA stream from NEO-6M
    while (!simulationMode && gpsSerial.available() > 0) {
        char c = gpsSerial.read();
        gps.encode(c);
    }

    // 2. High-speed IMU sampling (10 Hz = 100ms)
    unsigned long now = millis();
    if (!simulationMode && now - lastImuSampleMs >= SENSOR_READ_INTERVAL_MS) {
        lastImuSampleMs = now;
        imu.read(currentMpuData);
    }

    // 3. Update GPS coordinates & fix state
    if (simulationMode) {
        hasGpsFix = true;
    } else if (gps.location.isValid() && gps.location.age() < 2000) {
        hasGpsFix = true;
        currentLat = gps.location.lat();
        currentLng = gps.location.lng();
        currentSpeedKmH = gps.speed.isValid() ? gps.speed.kmph() : 0.0;
        currentCourseDeg = gps.course.isValid() ? gps.course.deg() : 0.0;
        currentHeading = GeoUtils::courseToCardinal(currentCourseDeg);
        satellitesCount = gps.satellites.value();
    } else {
        hasGpsFix = false;
        satellitesCount = gps.satellites.isValid() ? gps.satellites.value() : 0;
        currentSpeedKmH = 0.0;
    }

    // 4. Update Battery Level
    batteryPercent = readBatteryPercentage();

    // 5. Run Geofence & Risk Decision Engine
    updateRiskEngine();

    // 6. Drive Alert Actuators (LEDs + Buzzer)
    updateAlertOutputs();

    // 7. Output Telemetry at configured rate (2 seconds)
    if (now - lastTelemetryMs >= TELEMETRY_INTERVAL_MS) {
        lastTelemetryMs = now;
        // Print compact JSON to Serial monitor (unchanged format)
        String serialPayload = buildTelemetryPayload();
        Serial.println(serialPayload);
        maintainWifi();
        // Upload to Firestore via REST API (no Cloud Functions required)
        transmitTelemetry(serialPayload);
    }
}
