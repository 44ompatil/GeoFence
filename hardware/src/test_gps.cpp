/**
 * ============================================================================
 * UNIT TEST: NEO-6M GPS HARDWARE & SATELLITE FIX TEST
 * Target Board: ESP32 DevKit V1 (ESP-WROOM-32)
 * Connections:
 *   ESP32 GPIO 16 (RX2) <- NEO-6M TX
 *   ESP32 GPIO 17 (TX2) -> NEO-6M RX
 *   ESP32 3.3V or VIN   -> NEO-6M VCC (Board has 3.3V regulator; 5V is ideal)
 *   ESP32 GND           -> NEO-6M GND
 * ============================================================================
 */

#include <Arduino.h>
#include <HardwareSerial.h>
#include <TinyGPSPlus.h>
#include "Config.h"
#include "GeoUtils.h"

// Hardware Serial 2 on ESP32
HardwareSerial gpsSerial(2);
TinyGPSPlus gps;

unsigned long lastPrintTime = 0;
unsigned long bytesReceived = 0;
unsigned long sentencesWithFix = 0;
bool hasShownDataWarning = false;

void printBanner() {
    Serial.println("\n=======================================================");
    Serial.println("  ESP32 DevKit V1 - NEO-6M GPS HARDWARE TEST");
    Serial.println("=======================================================");
    Serial.println("Initializing HardwareSerial 2 on RX2: GPIO 16, TX2: GPIO 17 @ 9600 baud...");
}

void setup() {
    Serial.begin(115200);
    delay(1000);

    printBanner();

    // Start ESP32 Hardware UART 2
    gpsSerial.begin(GPS_BAUD_RATE, SERIAL_8N1, PIN_GPS_RX, PIN_GPS_TX);

    Serial.println("[STATUS] Listening for GPS NMEA sentences...");
    Serial.println("-------------------------------------------------------");
}

void loop() {
    // Read all incoming characters from NEO-6M
    while (gpsSerial.available() > 0) {
        char c = gpsSerial.read();
        bytesReceived++;
        gps.encode(c);
    }

    // Every 1 second, print structured diagnostic
    if (millis() - lastPrintTime >= 1000) {
        lastPrintTime = millis();

        // 1. Check if GPS is sending ANY serial bytes
        if (bytesReceived == 0) {
            Serial.println("[WAITING] No serial bytes received yet...");
            if (millis() > 5000 && !hasShownDataWarning) {
                hasShownDataWarning = true;
                Serial.println("\n[!] WIRING ALERT: No communication detected from NEO-6M!");
                Serial.println("    1. Check GPS TX connects to ESP32 GPIO 16 (RX2).");
                Serial.println("    2. Check GPS RX connects to ESP32 GPIO 17 (TX2).");
                Serial.println("    3. Check power: GPS VCC to 5V (VIN) or 3.3V, and GND to GND.");
                Serial.println("    4. Verify GPS module power LED is illuminated.\n");
            }
            return;
        }

        // 2. We have serial communication!
        Serial.println("\n--- [GPS DIAGNOSTIC REPORT] ---");
        Serial.print("Raw Bytes Received : "); Serial.println(bytesReceived);
        Serial.print("NMEA Passed Chksum : "); Serial.println(gps.passedChecksum());
        Serial.print("Satellites In View : "); Serial.println(gps.satellites.value());
        Serial.print("Precision (HDOP)   : "); Serial.println(gps.hdop.hdop());

        // 3. Fix Evaluation
        if (gps.location.isValid()) {
            sentencesWithFix++;
            double lat = gps.location.lat();
            double lng = gps.location.lng();
            double speedKmH = gps.speed.kmph();
            double courseDeg = gps.course.deg();
            const char* cardinal = GeoUtils::courseToCardinal(courseDeg);

            Serial.println(">>> SATELLITE FIX: [VALID LOCK - 3D FIX ACTIVE] <<<");
            Serial.printf("Latitude           : %0.6f°\n", lat);
            Serial.printf("Longitude          : %0.6f°\n", lng);
            Serial.printf("Altitude           : %0.1f meters\n", gps.altitude.meters());
            Serial.printf("Speed              : %0.2f km/h (%0.2f knots)\n", speedKmH, gps.speed.knots());
            Serial.printf("Heading / Direction: %0.1f° (%s)\n", courseDeg, cardinal);

            if (gps.date.isValid() && gps.time.isValid()) {
                Serial.printf("UTC Timestamp      : %04d-%02d-%02d %02d:%02d:%02d\n",
                    gps.date.year(), gps.date.month(), gps.date.day(),
                    gps.time.hour(), gps.time.minute(), gps.time.second());
            }

            // Test Haversine distance from default safe zone
            float distToHome = GeoUtils::haversineMeters(lat, lng, DEFAULT_SAFE_LAT, DEFAULT_SAFE_LNG);
            Serial.printf("Distance to Home   : %0.1f meters\n", distToHome);
        } else {
            Serial.println(">>> SATELLITE FIX: [SEARCHING FOR SATELLITES...] <<<");
            Serial.println("    Note: GPS requires open sky visibility to calculate coordinates.");
            Serial.println("    Place the antenna near an open window or outdoors.");
            Serial.println("    Once fixed, the onboard red PPS LED will start pulsing @ 1Hz.");
        }
        Serial.println("-------------------------------");
    }
}
