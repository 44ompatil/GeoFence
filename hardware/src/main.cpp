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
#include <ssl_client.h>
#include <mbedtls/x509_crt.h>
#include <HTTPClient.h>
#include <TinyGPSPlus.h>
#include <ArduinoJson.h>
#include <string.h>
#include <time.h>
#include <esp_sntp.h>

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
float distanceToBoundary = 0.0f;
double safeZoneLat = 0.0;
double safeZoneLng = 0.0;
float safeZoneRadiusMeters = 0.0f;
float safeZoneWarningMeters = 0.0f;
String safeZoneName;
String safeZoneId;
bool safeZoneConfigValid = false;
unsigned long lastSafeZoneRefreshMs = 0;
unsigned long lastSafeZoneFetchAttemptMs = 0;
static const unsigned long SAFE_ZONE_REFRESH_INTERVAL_MS = 15000UL;
static const unsigned long SAFE_ZONE_MAX_AGE_MS = 30000UL;

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
bool wifiConnectedLogged = false;
volatile bool ntpSyncNotification = false;
bool ntpSyncConfirmed = false;
bool ntpTimeoutReported = false;
unsigned long ntpSyncStartedMs = 0;

void onNtpTimeSync(struct timeval* tv) {
    (void)tv;
    ntpSyncNotification = true;
}

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
-----BEGIN CERTIFICATE-----
MIICCTCCAY6gAwIBAgINAgPlwGjvYxqccpBQUjAKBggqhkjOPQQDAzBHMQswCQYD
VQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZpY2VzIExMQzEUMBIG
A1UEAxMLR1RTIFJvb3QgUjQwHhcNMTYwNjIyMDAwMDAwWhcNMzYwNjIyMDAwMDAw
WjBHMQswCQYDVQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZpY2Vz
IExMQzEUMBIGA1UEAxMLR1RTIFJvb3QgUjQwdjAQBgcqhkjOPQIBBgUrgQQAIgNi
AATzdHOnaItgrkO4NcWBMHtLSZ37wWHO5t5GvWvVYRg1rkDdc/eJkTBa6zzuhXyi
QHY7qca4R9gq55KRanPpsXI5nymfopjTX15YhmUPoYRlBtHci8nHc8iMai/lxKvR
HYqjQjBAMA4GA1UdDwEB/wQEAwIBhjAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQW
BBSATNbrdP9JNqPV2Py1PsVq8JQdjDAKBggqhkjOPQQDAwNpADBmAjEA6ED/g94D
9J+uHXqnLrmvT/aDHQ4thQEd0dlq7A/Cr8deVl5c1RxYIigL9zC2L7F8AjEA8GE8
p/SgguMh1YQdc4acLa/KNJvxn7kjNuK8YAOdgLOaVsjh4rsUecrNIdSUtUlD
-----END CERTIFICATE-----
)PEM";

class DiagnosticWiFiClientSecure : public WiFiClientSecure {
public:
    int connect(const char* host, uint16_t port) override {
        IPAddress address;
        if (!WiFi.hostByName(host, address)) {
            _lastError = -1;
            Serial.printf("[TLS] DNS lookup failed for %s.\n", host);
            return 0;
        }

        const int result = start_ssl_client(sslclient, address, port, host,
            _timeout, _CA_cert, _use_ca_bundle, _cert, _private_key,
            _pskIdent, _psKey, _use_insecure, _alpn_protos);
        _lastError = result;
        if (result < 0) {
            const uint32_t verifyFlags = mbedtls_ssl_get_verify_result(&sslclient->ssl_ctx);
            if (verifyFlags != 0) {
                char verifyInfo[256] = {0};
                mbedtls_x509_crt_verify_info(verifyInfo, sizeof(verifyInfo), "  - ", verifyFlags);
                Serial.printf("[TLS] Certificate verification for %s failed; flags=0x%08lx:\n%s",
                    host, (unsigned long)verifyFlags, verifyInfo);
            } else {
                Serial.printf("[TLS] Handshake failed with no X.509 verify flags (error %d).\n", result);
            }
            stop();
            return 0;
        }

        _connected = true;
        return 1;
    }
};

bool isSystemTimePlausible(time_t timestamp) {
    // Reject the ESP32's unset clock and obviously stale dates before TLS.
    return timestamp >= 1704067200; // 2024-01-01 00:00:00 UTC
}

bool isValidCoordinate(double lat, double lng);

void printSystemTime(const char* context) {
    const time_t now = time(nullptr);
    struct tm utcTime;
    if (isSystemTimePlausible(now) && gmtime_r(&now, &utcTime) != nullptr) {
        char formatted[24];
        strftime(formatted, sizeof(formatted), "%Y-%m-%d %H:%M:%S UTC", &utcTime);
        Serial.printf("[TIME] %s: %s (epoch %lld)\n", context, formatted, (long long)now);
    } else {
        Serial.printf("[TIME] %s: invalid/unset (epoch %lld)\n", context, (long long)now);
    }
}

bool hasRealGpsFix() {
    return !simulationMode && hasGpsFix &&
        gps.location.isValid() && gps.location.age() < 2000 &&
        isValidCoordinate(currentLat, currentLng);
}

bool hasUsableGeofenceLocation() {
    return simulationMode
        ? hasGpsFix && isValidCoordinate(currentLat, currentLng)
        : hasRealGpsFix();
}

String currentGpsTimestamp() {
    const time_t now = time(nullptr);
    struct tm utcTime;
    if (!isSystemTimePlausible(now) || gmtime_r(&now, &utcTime) == nullptr) {
        return String();
    }

    char formatted[25];
    if (strftime(formatted, sizeof(formatted), "%Y-%m-%dT%H:%M:%SZ", &utcTime) == 0) {
        return String();
    }
    return String(formatted);
}

bool ensureNetworkTime() {
    if (!clockSyncRequested) {
        sntp_set_time_sync_notification_cb(onNtpTimeSync);
        configTime(0, 0, "pool.ntp.org", "time.google.com", "time.cloudflare.com");
        clockSyncRequested = true;
        ntpSyncStartedMs = millis();
        Serial.println("[NTP] Synchronization started; HTTPS remains blocked until SNTP confirms a valid clock.");
    }

    if (ntpSyncNotification) {
        ntpSyncNotification = false;
        const time_t now = time(nullptr);
        if (isSystemTimePlausible(now)) {
            ntpSyncConfirmed = true;
            ntpTimeoutReported = false;
            Serial.println("[NTP] Synchronization succeeded.");
            printSystemTime("After NTP synchronization");
        } else {
            Serial.println("[NTP] Update notification received, but the system clock is still invalid.");
        }
    }

    if (!ntpSyncConfirmed) {
        if (!ntpTimeoutReported && millis() - ntpSyncStartedMs >= 30000UL) {
            Serial.println("[NTP] Synchronization failed: no valid SNTP time received within 30 seconds; HTTPS is still blocked.");
            printSystemTime("NTP timeout");
            ntpTimeoutReported = true;
        }
        return false;
    }

    if (!isSystemTimePlausible(time(nullptr))) {
        ntpSyncConfirmed = false;
        Serial.println("[NTP] System clock became invalid; blocking HTTPS requests.");
        return false;
    }
    return true;
}

void logHttpsOutcome(const char* service, int responseCode, DiagnosticWiFiClientSecure& secureClient) {
    if (responseCode > 0) {
        Serial.printf("[TLS] %s verified HTTPS connection succeeded; HTTP %d.\n", service, responseCode);
        return;
    }

    char tlsError[128] = {0};
    const int tlsErrorCode = secureClient.lastError(tlsError, sizeof(tlsError));
    Serial.printf("[TLS] %s failed before an HTTP response (HTTPClient %d; TLS %d: %s).\n",
        service, responseCode, tlsErrorCode,
        tlsError[0] ? tlsError : "no TLS detail available");
}

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
        printCommandAck(type, false, "Safe-zone configuration is managed by the dashboard and loaded from Firestore");
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
    if (!hasUsableGeofenceLocation() || !safeZoneConfigValid ||
        millis() - lastSafeZoneRefreshMs >= SAFE_ZONE_MAX_AGE_MS) {
        currentRisk = RISK_SAFE;
        distanceToCenter = 0.0f;
        distanceToBoundary = 0.0f;
        return;
    }

    // Evaluate boundary with Haversine
    currentRisk = GeoUtils::evaluateRisk(
        currentLat, currentLng,
        safeZoneLat, safeZoneLng,
        safeZoneRadiusMeters, safeZoneWarningMeters,
        distanceToCenter, distanceToBoundary
    );

}

// ----------------------------------------------------------------------------
// ACTUATOR / ALERT OUTPUTS CONTROLLER
// ----------------------------------------------------------------------------
void updateAlertOutputs() {
    unsigned long now = millis();

    if (!hasUsableGeofenceLocation() || !safeZoneConfigValid ||
        millis() - lastSafeZoneRefreshMs >= SAFE_ZONE_MAX_AGE_MS) {
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
static unsigned long authLastFailureMs = 0;
static unsigned long authRetryDelayMs = 0;
static unsigned long authLastBackoffNoticeMs = 0;
static uint8_t authFailureCount = 0;
static bool authBackoffActive = false;

static const char* FIREBASE_AUTH_HOST = "identitytoolkit.googleapis.com";

bool logFirebaseErrorCode(const String& responseBody, const char* operation) {
    JsonDocument response;
    if (deserializeJson(response, responseBody) != DeserializationError::Ok) {
        Serial.printf("[Auth] %s error body was not valid JSON; body suppressed.\n", operation);
        return false;
    }

    const char* code = response["error"]["message"] | "";
    if (code[0] == '\0') {
        Serial.printf("[Auth] %s returned no Firebase error code; body suppressed.\n", operation);
        return false;
    }

    // Firebase error identifiers use uppercase letters, digits, and underscores.
    // Reject anything else rather than risking accidental data disclosure.
    for (const char* character = code; *character != '\0'; ++character) {
        if (!((*character >= 'A' && *character <= 'Z') ||
              (*character >= '0' && *character <= '9') || *character == '_')) {
            Serial.printf("[Auth] %s returned an unrecognized error format; body suppressed.\n", operation);
            return false;
        }
    }

    Serial.printf("[Auth] %s Firebase error code: %s (response body suppressed).\n",
        operation, code);
    return true;
}

void scheduleAuthRetry() {
    static const unsigned long retryDelaysMs[] = {
        30000UL, 60000UL, 120000UL, 240000UL, 480000UL, 900000UL
    };
    if (authFailureCount < sizeof(retryDelaysMs) / sizeof(retryDelaysMs[0])) {
        ++authFailureCount;
    }
    const size_t retryIndex = authFailureCount == 0
        ? 0
        : authFailureCount - 1;
    authRetryDelayMs = retryDelaysMs[retryIndex];
    authLastFailureMs = millis();
    authBackoffActive = true;
    authLastBackoffNoticeMs = authLastFailureMs;
    Serial.printf("[Auth] Retry delayed %lu seconds (failure #%u).\n",
        authRetryDelayMs / 1000UL, authFailureCount);
}

void clearAuthRetryBackoff() {
    authFailureCount = 0;
    authRetryDelayMs = 0;
    authBackoffActive = false;
}

// Sign in with email + password.
// POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=API_KEY
bool signInWithEmailPassword() {
    const bool apiKeyConfigured = strlen(GEOFENCE_FIREBASE_API_KEY) > 0;
    const bool emailConfigured = strlen(GEOFENCE_AUTH_EMAIL) > 0;
    const bool passwordConfigured = strlen(GEOFENCE_AUTH_PASSWORD) > 0;
    const bool projectConfigured = strlen(GEOFENCE_PROJECT_ID) > 0;
    Serial.printf("[Auth] Endpoint host=%s; API key configured=%s; project configured=%s.\n",
        FIREBASE_AUTH_HOST, apiKeyConfigured ? "yes" : "no",
        projectConfigured ? "yes" : "no");
    if (!apiKeyConfigured || !emailConfigured || !passwordConfigured || !projectConfigured) {
        Serial.printf("[Auth] Required configuration present: API key=%s, email=%s, password=%s, project=%s.\n",
            apiKeyConfigured ? "yes" : "no", emailConfigured ? "yes" : "no",
            passwordConfigured ? "yes" : "no", projectConfigured ? "yes" : "no");
        return false;
    }

    String url = String("https://") + FIREBASE_AUTH_HOST
                 + "/v1/accounts:signInWithPassword?key="
                 + GEOFENCE_FIREBASE_API_KEY;
    JsonDocument req;
    req["email"]             = GEOFENCE_AUTH_EMAIL;
    req["password"]          = GEOFENCE_AUTH_PASSWORD;
    req["returnSecureToken"] = true;

    const bool fieldsPresent = req["email"].is<const char*>() &&
        req["password"].is<const char*>() && req["returnSecureToken"].is<bool>();
    const size_t expectedLength = measureJson(req);
    String body;
    const bool bufferReserved = expectedLength > 0 && body.reserve(expectedLength);
    const size_t serializedLength = bufferReserved ? serializeJson(req, body) : 0;
    const bool serializationSucceeded = bufferReserved && serializedLength == expectedLength &&
        body.length() == expectedLength;
    Serial.printf("[Auth] JSON serialization=%s; fields email=%s, password=%s, returnSecureToken=%s.\n",
        serializationSucceeded ? "ok" : "failed",
        req["email"].is<const char*>() ? "present" : "missing",
        req["password"].is<const char*>() ? "present" : "missing",
        req["returnSecureToken"].is<bool>() ? "present" : "missing");
    if (!fieldsPresent || !serializationSucceeded) {
        Serial.println("[Auth] Sign-in request not sent because its JSON payload was incomplete.");
        return false;
    }

    DiagnosticWiFiClientSecure secureClient;
    secureClient.setCACert(FIREBASE_ROOT_CA);

    HTTPClient http;
    http.setTimeout(8000);
    if (!http.begin(secureClient, url)) {
        Serial.printf("[Auth] Failed to initialize sign-in HTTPS request to %s; no request was sent.\n",
            FIREBASE_AUTH_HOST);
        return false;
    }

    http.addHeader("Content-Type", "application/json");
    Serial.printf("[Auth] Sending sign-in POST to %s; payload values suppressed.\n",
        FIREBASE_AUTH_HOST);

    printSystemTime("Before Firebase sign-in HTTPS");
    int code = http.POST(body);
    String resp = http.getString();
    logHttpsOutcome("Firebase Auth sign-in", code, secureClient);
    Serial.printf("[Auth] Sign-in HTTP response: %d\n", code);
    http.end();

    if (code != 200) {
        if (code > 0) {
            logFirebaseErrorCode(resp, "Sign-in");
        } else {
            Serial.printf("[Auth] Sign-in transport failure: %s.\n", http.errorToString(code).c_str());
        }
        return false;
    }

    JsonDocument respDoc;
    if (deserializeJson(respDoc, resp) != DeserializationError::Ok) {
        Serial.println("[Auth] Failed to parse sign-in response.");
        return false;
    }

    firebaseIdToken    = respDoc["idToken"].as<String>();
    firebaseRefreshTok = respDoc["refreshToken"].as<String>();
    if (firebaseIdToken.isEmpty() || firebaseRefreshTok.isEmpty()) {
        firebaseIdToken = "";
        firebaseRefreshTok = "";
        Serial.println("[Auth] Sign-in response did not contain both tokens; response body suppressed.");
        return false;
    }
    lastTokenRefreshMs = millis();
    tokenBootstrapped  = true;
    Serial.println("[Auth] Signed in to Firebase successfully.");
    return true;
}

// Refresh an expired ID token using the stored refresh token.
// POST https://securetoken.googleapis.com/v1/token?key=API_KEY
bool refreshIdToken() {
    if (firebaseRefreshTok.isEmpty()) return false;

    DiagnosticWiFiClientSecure secureClient;
    secureClient.setCACert(FIREBASE_ROOT_CA);

    HTTPClient http;
    http.setTimeout(8000);
    String url = String("https://securetoken.googleapis.com/v1/token?key=")
                 + GEOFENCE_FIREBASE_API_KEY;
    if (!http.begin(secureClient, url)) {
        Serial.println("[Auth] Failed to initialize token-refresh HTTPS request; no connection was attempted.");
        return false;
    }

    http.addHeader("Content-Type", "application/x-www-form-urlencoded");
    String body = "grant_type=refresh_token&refresh_token=" + firebaseRefreshTok;

    printSystemTime("Before Firebase token-refresh HTTPS");
    int code = http.POST(body);
    String resp = http.getString();
    logHttpsOutcome("Firebase Auth token refresh", code, secureClient);
    Serial.printf("[Auth] Token-refresh HTTP response: %d\n", code);
    http.end();

    if (code != 200) {
        if (code > 0) {
            logFirebaseErrorCode(resp, "Token refresh");
        } else {
            Serial.printf("[Auth] Token-refresh transport failure: %s.\n",
                http.errorToString(code).c_str());
        }
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
    const unsigned long now = millis();
    if (authBackoffActive && now - authLastFailureMs < authRetryDelayMs) {
        if (now - authLastBackoffNoticeMs >= 60000UL) {
            authLastBackoffNoticeMs = now;
            const unsigned long remainingMs = authRetryDelayMs - (now - authLastFailureMs);
            Serial.printf("[Auth] Retry backoff active; next attempt in at least %lu seconds.\n",
                (remainingMs + 999UL) / 1000UL);
        }
        return false;
    }

    bool succeeded = false;
    if (!tokenBootstrapped) {
        succeeded = signInWithEmailPassword();
    } else if (now - lastTokenRefreshMs >= 55UL * 60UL * 1000UL) {
        // Refresh 5 minutes before the 60-minute expiry.
        succeeded = refreshIdToken();
    } else {
        clearAuthRetryBackoff();
        return true;
    }

    if (succeeded) {
        clearAuthRetryBackoff();
        return true;
    }

    scheduleAuthRetry();
    return false;
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
    if (!wifiStarted) return;

    const wl_status_t status = WiFi.status();
    if (status == WL_CONNECTED) {
        if (!wifiConnectedLogged) {
            const String ip = WiFi.localIP().toString();
            Serial.printf("[WiFi] Connected; status=%d, IP=%s, RSSI=%d dBm.\n",
                (int)status, ip.c_str(), WiFi.RSSI());
            wifiConnectedLogged = true;
        }
        return;
    }

    if (wifiConnectedLogged) {
        Serial.printf("[WiFi] Connection lost; status=%d.\n", (int)status);
        wifiConnectedLogged = false;
    }

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
    const bool includeGpsCoordinates = hasRealGpsFix();
    const bool geofenceReady = safeZoneConfigValid && hasUsableGeofenceLocation();

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
    strVal(fields, "status", !safeZoneConfigValid ? String("Zone Unavailable")
        : !geofenceReady ? String("GPS Unavailable")
        : String(GeoUtils::riskStateToString(currentRisk)));
    strVal(fields, "riskLevel", geofenceReady
        ? String(GeoUtils::riskLevelToFrontend(currentRisk)) : String("UNKNOWN"));
    strVal(fields, "heading",  currentHeading);

    char speedBuf[16];
    snprintf(speedBuf, sizeof(speedBuf), "%0.1f km/h", currentSpeedKmH);
    strVal(fields, "speed", String(speedBuf));

    intVal(fields, "collarBattery", batteryPercent);
    boolVal(fields, "hasFix", includeGpsCoordinates);
    intVal(fields, "satellites", satellitesCount);

    if (includeGpsCoordinates) {
        dblVal(fields, "lat", currentLat);
        dblVal(fields, "lng", currentLng);
        dblVal(fields, "distanceToBoundary", round(distanceToBoundary * 10.0) / 10.0);
        dblVal(fields, "motionLevel", round(currentMpuData.motionAcceleration * 100.0) / 100.0);
        strVal(fields, "activity", String(currentMpuData.activity));
        const String gpsTimestamp = currentGpsTimestamp();
        if (gpsTimestamp.length() > 0) {
            fields["gpsTimestamp"]["timestampValue"] = gpsTimestamp;
        }
    }

    String payload;
    serializeJson(doc, payload);
    return payload;
}

// Build a simple JSON payload for the Serial monitor (unchanged format)
String buildTelemetryPayload() {
    JsonDocument doc;
    const bool includeGpsCoordinates = hasRealGpsFix();
    const bool geofenceReady = safeZoneConfigValid && hasUsableGeofenceLocation();
    doc["deviceId"] = DEVICE_ID;
    doc["status"]   = !safeZoneConfigValid ? "Zone Unavailable"
        : !geofenceReady ? "GPS Unavailable"
        : GeoUtils::riskStateToString(currentRisk);
    doc["riskLevel"]= geofenceReady
        ? GeoUtils::riskLevelToFrontend(currentRisk) : "UNKNOWN";
    doc["heading"]  = currentHeading;

    char speedBuf[16];
    snprintf(speedBuf, sizeof(speedBuf), "%0.1f km/h", currentSpeedKmH);
    doc["speed"] = speedBuf;

    doc["collarBattery"] = batteryPercent;
    doc["hasFix"]        = includeGpsCoordinates;
    doc["satellites"]    = satellitesCount;
    doc["coordinatesIncluded"] = includeGpsCoordinates;
    doc["simulationMode"] = simulationMode;

    if (includeGpsCoordinates) {
        doc["lat"]               = currentLat;
        doc["lng"]               = currentLng;
        doc["distanceToBoundary"]= round(distanceToBoundary * 10.0) / 10.0;
        doc["motionLevel"]       = round(currentMpuData.motionAcceleration * 100.0) / 100.0;
        doc["activity"]          = currentMpuData.activity;
        const String gpsTimestamp = currentGpsTimestamp();
        if (gpsTimestamp.length() > 0) {
            doc["gpsTimestamp"] = gpsTimestamp;
        }
    }

    String payload;
    serializeJson(doc, payload);
    return payload;
}

bool isSafeZoneDocumentId(const String& id) {
    if (id.isEmpty() || id.length() > 150) return false;
    for (size_t i = 0; i < id.length(); ++i) {
        const char c = id[i];
        if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
              (c >= '0' && c <= '9') || c == '-' || c == '_')) {
            return false;
        }
    }
    return true;
}

bool firestoreNumber(JsonVariantConst typedValue, double& value) {
    JsonVariantConst doubleValue = typedValue["doubleValue"];
    if (!doubleValue.isNull() && doubleValue.is<double>()) {
        value = doubleValue.as<double>();
        return isfinite(value);
    }

    JsonVariantConst integerValue = typedValue["integerValue"];
    if (!integerValue.isNull()) {
        const char* text = integerValue.as<const char*>();
        if (text) {
            char* end = nullptr;
            value = strtod(text, &end);
            return end != text && *end == '\0' && isfinite(value);
        }
    }

    JsonVariantConst stringValue = typedValue["stringValue"];
    if (!stringValue.isNull()) {
        const char* text = stringValue.as<const char*>();
        if (text) {
            char* end = nullptr;
            value = strtod(text, &end);
            return end != text && isfinite(value);
        }
    }
    return false;
}

bool firestoreGetDocument(const String& documentPath, JsonDocument& responseDoc,
                          const char* description) {
    const String url = String("https://firestore.googleapis.com/v1/projects/")
        + GEOFENCE_PROJECT_ID + "/databases/(default)/documents/" + documentPath;
    DiagnosticWiFiClientSecure secureClient;
    secureClient.setCACert(FIREBASE_ROOT_CA);

    HTTPClient request;
    request.setTimeout(8000);
    if (!request.begin(secureClient, url)) {
        Serial.printf("[Zone] Could not initialize Firestore GET for %s.\n", description);
        return false;
    }
    request.addHeader("Authorization", "Bearer " + firebaseIdToken);
    const int responseCode = request.GET();
    const String responseBody = responseCode == 200 ? request.getString() : String();
    logHttpsOutcome(description, responseCode, secureClient);
    request.end();

    if (responseCode != 200) {
        Serial.printf("[Zone] Firestore GET for %s failed with HTTP %d.\n",
            description, responseCode);
        return false;
    }
    if (deserializeJson(responseDoc, responseBody) != DeserializationError::Ok) {
        Serial.printf("[Zone] Firestore GET response for %s was invalid JSON.\n", description);
        return false;
    }
    return true;
}

bool refreshSafeZoneConfig() {
    lastSafeZoneFetchAttemptMs = millis();
    safeZoneConfigValid = false;

    if (!wifiStarted || WiFi.status() != WL_CONNECTED || !ensureNetworkTime() ||
        !ensureValidToken()) {
        Serial.println("[Zone] Safe-zone refresh unavailable; current configuration will expire if it becomes stale.");
        return false;
    }

    JsonDocument petDoc;
    const String petPath = String("users/") + GEOFENCE_OWNER_UID + "/pets/" + GEOFENCE_PET_ID;
    if (!firestoreGetDocument(petPath, petDoc, "Firestore pet configuration")) {
        Serial.println("[Zone] Safe-zone configuration unavailable: could not read paired pet.");
        return false;
    }

    const char* assignedId = petDoc["fields"]["safeZoneId"]["stringValue"] | "";
    const String requestedZoneId(assignedId);
    if (!isSafeZoneDocumentId(requestedZoneId)) {
        safeZoneConfigValid = false;
        Serial.println("[Zone] Safe-zone configuration unavailable: pet has no valid safeZoneId.");
        return false;
    }
    if (!safeZoneId.isEmpty() && requestedZoneId != safeZoneId) {
        Serial.println("[Zone] Pet assignment changed; previous zone disabled while the new assignment loads.");
    }

    JsonDocument zoneDoc;
    const String zonePath = String("users/") + GEOFENCE_OWNER_UID + "/safeZones/" + requestedZoneId;
    if (!firestoreGetDocument(zonePath, zoneDoc, "Firestore assigned safe zone")) {
        Serial.printf("[Zone] Safe-zone configuration unavailable: assigned zone '%s' could not be read.\n",
            requestedZoneId.c_str());
        return false;
    }

    JsonVariantConst fields = zoneDoc["fields"];
    const char* shape = fields["shape"]["stringValue"] | "";
    if (strcmp(shape, "Circle") != 0) {
        Serial.printf("[Zone] Safe-zone configuration unavailable: shape '%s' is not supported by the circle geofence.\n",
            shape);
        return false;
    }

    JsonVariantConst centerFields = fields["center"]["mapValue"]["fields"];
    JsonVariantConst latValue = centerFields["lat"];
    JsonVariantConst lngValue = centerFields["lng"];
    if (latValue.isNull()) latValue = fields["lat"];
    if (lngValue.isNull()) lngValue = fields["lng"];

    double zoneLat = 0.0;
    double zoneLng = 0.0;
    double radiusMeters = 0.0;
    double warningMeters = 0.0;
    if (!firestoreNumber(latValue, zoneLat) || !firestoreNumber(lngValue, zoneLng) ||
        !firestoreNumber(fields["radiusMeters"], radiusMeters)) {
        Serial.println("[Zone] Safe-zone configuration unavailable: center or radius is missing/invalid.");
        return false;
    }

    JsonVariantConst warningValue = fields["warningDistanceMeters"];
    if (warningValue.isNull()) warningValue = fields["warningDistance"];
    if (!firestoreNumber(warningValue, warningMeters) ||
        !isValidCoordinate(zoneLat, zoneLng) || !isfinite(radiusMeters) ||
        radiusMeters <= 0.0 || radiusMeters > 100000.0 ||
        !isfinite(warningMeters) || warningMeters < 0.0 || warningMeters >= radiusMeters) {
        Serial.println("[Zone] Safe-zone configuration unavailable: values failed validation.");
        return false;
    }

    const char* zoneName = fields["name"]["stringValue"] | "";
    if (strlen(zoneName) > 64) {
        Serial.println("[Zone] Safe-zone configuration unavailable: name is too long.");
        return false;
    }

    // Apply the fetched configuration atomically only after every field validates.
    safeZoneId = requestedZoneId;
    safeZoneName = zoneName;
    safeZoneLat = zoneLat;
    safeZoneLng = zoneLng;
    safeZoneRadiusMeters = (float)radiusMeters;
    safeZoneWarningMeters = (float)warningMeters;
    safeZoneConfigValid = true;
    lastSafeZoneRefreshMs = millis();
    Serial.printf("[Zone] Loaded Firestore safe zone '%s' (%s): center %.7f, %.7f; radius %.1f m; warning %.1f m.\n",
        safeZoneName.c_str(), safeZoneId.c_str(), safeZoneLat, safeZoneLng,
        safeZoneRadiusMeters, safeZoneWarningMeters);
    return true;
}

void maintainSafeZoneConfig() {
    const unsigned long now = millis();
    if (safeZoneConfigValid && now - lastSafeZoneRefreshMs >= SAFE_ZONE_MAX_AGE_MS) {
        safeZoneConfigValid = false;
        Serial.println("[Zone] Cached safe-zone configuration expired; geofence alerts are disabled.");
    }
    if (lastSafeZoneFetchAttemptMs == 0 || now - lastSafeZoneFetchAttemptMs >= SAFE_ZONE_REFRESH_INTERVAL_MS) {
        refreshSafeZoneConfig();
    }
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

    if (!ensureNetworkTime()) return;

    // Ensure we have a valid Firebase ID token
    if (!ensureValidToken()) {
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
    const bool includeGpsCoordinates = hasRealGpsFix();
    const String gpsTimestamp = includeGpsCoordinates ? currentGpsTimestamp() : String();
    Serial.printf("[HTTPS] telemetry request coordinatesIncluded=%s, fix=%s, satellites=%d%s\n",
        includeGpsCoordinates ? "true" : "false",
        includeGpsCoordinates ? "true" : "false", satellitesCount,
        simulationMode ? " (simulation excluded)" : "");

    if (includeGpsCoordinates) {
        patchUrl += "&updateMask.fieldPaths=lat"
                    "&updateMask.fieldPaths=lng"
                    "&updateMask.fieldPaths=distanceToBoundary"
                    "&updateMask.fieldPaths=motionLevel"
                    "&updateMask.fieldPaths=activity"
                    "&updateMask.fieldPaths=satellites";
        if (gpsTimestamp.length() > 0) {
            patchUrl += "&updateMask.fieldPaths=gpsTimestamp";
        }
    }

    DiagnosticWiFiClientSecure secureClient;
    secureClient.setCACert(FIREBASE_ROOT_CA);

    HTTPClient request;
    request.setTimeout(8000);
    if (!request.begin(secureClient, patchUrl)) {
        Serial.println("[HTTPS] Failed to initialize Firestore PATCH request; no connection was attempted.");
        return;
    }

    request.addHeader("Content-Type", "application/json");
    request.addHeader("Authorization", "Bearer " + firebaseIdToken);
    request.addHeader("X-HTTP-Method-Override", "PATCH");   // some TLS stacks need this

    String firestoreBody = buildFirestorePatchBody();
    // Use PATCH via sendRequest since HTTPClient::PATCH is not always available
    printSystemTime("Before Firestore HTTPS");
    int responseCode = request.sendRequest("PATCH", firestoreBody);
    logHttpsOutcome("Firestore telemetry", responseCode, secureClient);
    Serial.printf("[HTTPS] Firestore HTTP response: %d\n", responseCode);

    if (responseCode >= 200 && responseCode < 300) {
        Serial.printf("[HTTPS] Firestore telemetry accepted (%d).\n", responseCode);
    } else {
        if (responseCode > 0) {
            Serial.printf("[HTTPS] Firestore response body: %s\n", request.getString().c_str());
        } else {
            Serial.printf("[HTTPS] Firestore transport error: %s\n",
                request.errorToString(responseCode).c_str());
        }
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

    Serial.println("[CONFIG] Waiting for assigned safe-zone configuration from Firestore; geofence alerts are disabled until loaded.");
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
    } else if (gps.location.isValid() && gps.location.age() < 2000 &&
        isValidCoordinate(gps.location.lat(), gps.location.lng())) {
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

    // Load the dashboard-assigned zone periodically. If reads fail or the
    // cached configuration expires, geofence decisions and alarms stay off.
    maintainSafeZoneConfig();

    // 5. Run Geofence & Risk Decision Engine
    updateRiskEngine();

    // 6. Drive Alert Actuators (LEDs + Buzzer)
    updateAlertOutputs();

    // 7. Output Telemetry at configured rate (2 seconds)
    if (now - lastTelemetryMs >= TELEMETRY_INTERVAL_MS) {
        lastTelemetryMs = now;
        // Print compact JSON to Serial monitor (unchanged format)
        String serialPayload = buildTelemetryPayload();
        Serial.printf("[GPS] fix=%s satellites=%d coordinatesIncluded=%s\n",
            hasRealGpsFix() ? "true" : "false", satellitesCount,
            hasRealGpsFix() ? "true" : "false");
        Serial.println(serialPayload);
        maintainWifi();
        // Upload to Firestore via REST API (no Cloud Functions required)
        transmitTelemetry(serialPayload);
    }
}
