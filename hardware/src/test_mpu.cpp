/**
 * ============================================================================
 * UNIT TEST: MPU-6050 / MPU-6500 SENSOR IDENTIFIER & MOTION TEST
 * Target Board: ESP32 DevKit V1 (ESP-WROOM-32)
 * Connections:
 *   ESP32 GPIO 21 (SDA) -> MPU SDA
 *   ESP32 GPIO 22 (SCL) -> MPU SCL
 *   ESP32 3.3V / VIN    -> MPU VCC
 *   ESP32 GND           -> MPU GND
 * ============================================================================
 */

#include <Arduino.h>
#include <Wire.h>
#include "Config.h"
#include "MPU_Driver.h"

UniversalMPU imu;

void printBanner() {
    Serial.println("\n=======================================================");
    Serial.println("  ESP32 DevKit V1 - MPU6050 / MPU6500 HARDWARE TEST");
    Serial.println("=======================================================");
}

void printChipDiagnosis() {
    uint8_t whoami = imu.getWhoAmI();
    uint8_t addr = imu.getAddress();

    Serial.print("[I2C SCAN] Found device responding at address: 0x");
    if (addr < 16) Serial.print("0");
    Serial.println(addr, HEX);

    Serial.print("[WHO_AM_I] Register 0x75 returned: 0x");
    if (whoami < 16) Serial.print("0");
    Serial.println(whoami, HEX);

    Serial.print("[IDENTIFICATION] Result: ");
    switch (imu.getChipType()) {
        case MPU_CHIP_6050:
            Serial.println(">>> MPU-6050 DETECTED (Classic InvenSense 6-axis) <<<");
            break;
        case MPU_CHIP_6500:
            Serial.println(">>> MPU-6500 DETECTED (High-frequency 6-axis variant) <<<");
            Serial.println("    Note: Standard Adafruit library fails on 6500; this universal driver works seamlessly!");
            break;
        case MPU_CHIP_9250:
            Serial.println(">>> MPU-9250 / ICM Series DETECTED <<<");
            break;
        default:
            Serial.println(">>> COMPATIBLE CLONE / ALTERNATIVE IMU DETECTED <<<");
            break;
    }
    Serial.println("-------------------------------------------------------\n");
}

void setup() {
    Serial.begin(115200);
    delay(1000);

    printBanner();
    Serial.println("[STATUS] Initializing I2C on SDA: GPIO 21, SCL: GPIO 22...");

    if (!imu.begin(PIN_I2C_SDA, PIN_I2C_SCL)) {
        Serial.println("\n[ERROR] Could not communicate with IMU sensor!");
        Serial.println("Troubleshooting Checklist:");
        Serial.println("  1. Check wiring: SDA -> GPIO 21, SCL -> GPIO 22");
        Serial.println("  2. Check VCC (Connect to 3.3V or 5V on ESP32)");
        Serial.println("  3. Check GND connection");
        Serial.println("  4. If AD0 pin is present, connect to GND (or leave floating)");
        while (1) {
            delay(1000);
            Serial.print(".");
        }
    }

    printChipDiagnosis();
    Serial.println("Streaming live 6-axis motion data...\n");
    Serial.println("Accel (m/s^2)        | Gyro (deg/s)       | Temp   | Motion | Activity");
    Serial.println("   X      Y      Z   |   X     Y     Z    |  (°C)  | (m/s2) | Level");
    Serial.println("-----------------------------------------------------------------------");
}

void loop() {
    MpuData data;
    if (imu.read(data)) {
        // Accelerometer
        char accelBuf[32];
        snprintf(accelBuf, sizeof(accelBuf), "%5.2f  %5.2f  %5.2f", data.ax, data.ay, data.az);
        Serial.print(accelBuf);
        Serial.print(" | ");

        // Gyroscope
        char gyroBuf[32];
        snprintf(gyroBuf, sizeof(gyroBuf), "%5.1f %5.1f %5.1f", data.gx, data.gy, data.gz);
        Serial.print(gyroBuf);
        Serial.print(" | ");

        // Temperature
        char tempBuf[16];
        snprintf(tempBuf, sizeof(tempBuf), "%5.1f", data.temperature);
        Serial.print(tempBuf);
        Serial.print(" | ");

        // Motion magnitude (gravity-subtracted)
        char motBuf[16];
        snprintf(motBuf, sizeof(motBuf), "%5.2f", data.motionAcceleration);
        Serial.print(motBuf);
        Serial.print("  | ");

        // Activity tag
        Serial.print(data.activity);

        // Extra details on tilt
        Serial.print(" [Pitch: ");
        Serial.print((int)data.pitch);
        Serial.print("°, Roll: ");
        Serial.print((int)data.roll);
        Serial.println("°]");
    } else {
        Serial.println("[WARN] I2C read timeout / data corrupted.");
    }

    delay(300); // 3.3 Hz update for easy terminal reading
}
