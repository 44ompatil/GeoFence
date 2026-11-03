/**
 * Live sensor monitor for ESP32 DevKit V1.
 * Prints real GPS, IMU, and optional battery readings to Serial.
 */

#include <Arduino.h>
#include <HardwareSerial.h>
#include <TinyGPSPlus.h>

#include "Config.h"
#include "MPU_Driver.h"

HardwareSerial gpsSerial(2);
TinyGPSPlus gps;
UniversalMPU imu;

MpuData imuData;
bool imuReady = false;
bool imuDataValid = false;
bool gpsHasFix = false;
int batteryRawAdc = 0;
float batteryVoltage = 0.0f;
int batteryPercent = 0;

unsigned long lastImuSampleMs = 0;
unsigned long lastPrintMs = 0;

void printLiveData() {
    Serial.println("\n------------- LIVE SENSOR DATA -------------");

    if (gpsHasFix) {
        Serial.printf("GPS: FIX | Satellites: %u\n", gps.satellites.value());
        Serial.printf("     Latitude: %.6f | Longitude: %.6f\n",
            gps.location.lat(), gps.location.lng());
        Serial.printf("     Speed: %.1f km/h | Heading: %.1f deg\n",
            gps.speed.isValid() ? gps.speed.kmph() : 0.0,
            gps.course.isValid() ? gps.course.deg() : 0.0);
    } else if (gps.charsProcessed() == 0) {
        Serial.println("GPS: NO DATA (check GPS TX -> ESP32 GPIO 16)");
    } else {
        Serial.printf("GPS: SEARCHING FOR FIX | Satellites: %u\n",
            gps.satellites.isValid() ? gps.satellites.value() : 0);
    }

    if (imuReady && imuDataValid) {
        Serial.printf("IMU: %s | Activity: %s | Motion: %.2f m/s^2\n",
            imu.getChipName(), imuData.activity.c_str(),
            imuData.motionAcceleration);
        Serial.printf("     Accel X/Y/Z: %.2f / %.2f / %.2f m/s^2\n",
            imuData.ax, imuData.ay, imuData.az);
        Serial.printf("     Gyro X/Y/Z: %.1f / %.1f / %.1f deg/s | Temp: %.1f C\n",
            imuData.gx, imuData.gy, imuData.gz, imuData.temperature);
    } else if (imuReady) {
        Serial.println("IMU: NO DATA (check sensor connection)");
    } else {
        Serial.println("IMU: NOT DETECTED (check SDA GPIO 21 and SCL GPIO 22)");
    }

    batteryRawAdc = analogRead(PIN_BATTERY_ADC);
    if (batteryRawAdc >= 100) {
        batteryVoltage = (batteryRawAdc / 4095.0f) * 3.3f * 2.0f;
        if (batteryVoltage <= BATTERY_MIN_V) {
            batteryPercent = 5;
        } else if (batteryVoltage >= BATTERY_MAX_V) {
            batteryPercent = 100;
        } else {
            batteryPercent = (int)(((batteryVoltage - BATTERY_MIN_V) /
                (BATTERY_MAX_V - BATTERY_MIN_V)) * 100.0f);
        }
        Serial.printf("Battery: %d%% | %.2f V\n", batteryPercent, batteryVoltage);
    } else {
        Serial.printf("Battery: NO READING (ADC raw: %d; divider is optional)\n",
            batteryRawAdc);
    }

    Serial.println("--------------------------------------------");
}

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n=== GeoFence Live Sensor Test ===");
    Serial.println("Serial Monitor: 115200 baud");

    imuReady = imu.begin(PIN_I2C_SDA, PIN_I2C_SCL);
    if (imuReady) {
        Serial.printf("IMU detected: %s\n", imu.getChipName());
    } else {
        Serial.println("IMU not detected; will continue checking other sensors.");
    }

    gpsSerial.begin(GPS_BAUD_RATE, SERIAL_8N1, PIN_GPS_RX, PIN_GPS_TX);
    Serial.println("GPS listening on UART2 (RX GPIO 16, TX GPIO 17).");
    Serial.println("Live readings update every second.");
}

void loop() {
    while (gpsSerial.available() > 0) {
        gps.encode(gpsSerial.read());
    }

    unsigned long now = millis();
    if (now - lastImuSampleMs >= SENSOR_READ_INTERVAL_MS) {
        lastImuSampleMs = now;
        imuDataValid = imuReady && imu.read(imuData);
    }

    gpsHasFix = gps.location.isValid() && gps.location.age() < 2000;

    if (now - lastPrintMs >= 1000) {
        lastPrintMs = now;
        printLiveData();
    }
}
