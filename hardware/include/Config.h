#pragma once
#include <Arduino.h>

#if __has_include("Secrets.h")
#include "Secrets.h"
#endif

#ifndef GEOFENCE_WIFI_SSID
#define GEOFENCE_WIFI_SSID ""
#endif

#ifndef GEOFENCE_WIFI_PASSWORD
#define GEOFENCE_WIFI_PASSWORD ""
#endif

#ifndef GEOFENCE_INGEST_URL
#define GEOFENCE_INGEST_URL ""
#endif

#ifndef GEOFENCE_DEVICE_TOKEN
#define GEOFENCE_DEVICE_TOKEN ""
#endif

// ============================================================================
// HARDWARE PIN DEFINITIONS (ESP32 DevKit V1 / ESP-WROOM-32 30-pin & 36-pin)
// ============================================================================

// 1. I2C Bus for MPU6050 / MPU6500 IMU Sensor
#define PIN_I2C_SDA        21   // Hardware I2C SDA
#define PIN_I2C_SCL        22   // Hardware I2C SCL
#define MPU_I2C_ADDR_A     0x68 // Default I2C address (AD0 pulled LOW / float)
#define MPU_I2C_ADDR_B     0x69 // Alternate I2C address (AD0 pulled HIGH)

// 2. Hardware UART2 for NEO-6M GPS Module
#define PIN_GPS_RX         16   // ESP32 RX2 <- GPS TX pin
#define PIN_GPS_TX         17   // ESP32 TX2 -> GPS RX pin
#define GPS_BAUD_RATE      9600 // Default NEO-6M factory baud rate

// 3. Status Alert Output Indicators (Risk Indication)
#define PIN_LED_GREEN      25   // SAFE Status Indicator
#define PIN_LED_YELLOW     26   // CAUTION / Approaching Boundary Indicator (or Blue)
#define PIN_LED_RED        27   // HIGH RISK / Escaped / Breach Indicator
#define PIN_BUZZER         14   // Audible Warning Buzzer (Active / PWM Buzzer)

// 4. Battery Voltage Monitoring (Optional ADC connection)
#define PIN_BATTERY_ADC    34   // ADC1 Channel 6 (Input-only, no Wi-Fi conflict)
#define BATTERY_MIN_V      3.20f
#define BATTERY_MAX_V      4.20f

// ============================================================================
// FRONTEND-COMPATIBLE SYSTEM & GEOFENCE CONFIGURATION
// ============================================================================

// Device Identity (Matches GeoFence Frontend Catalog)
#define DEVICE_ID          "GF-2048-ESP32"
#define DEVICE_NAME        "Max's Collar"

// Default Geofence Reference Point (Matching Frontend default coordinates)
#define DEFAULT_SAFE_LAT   16.667670504118114
#define DEFAULT_SAFE_LNG   74.19424365299322
#define DEFAULT_SAFE_ZONE  "Home Zone"

// Geofencing Radial Distance Thresholds (in meters)
#define DEFAULT_RADIUS_METERS     10.0f  // Safe Zone perimeter radius
#define DEFAULT_WARNING_METERS    2.0f   // Warning buffer distance from boundary

// Movement Acceleration Thresholds (in m/s^2 dynamic acceleration)
#define MOTION_THRESH_STATIONARY  0.25f
#define MOTION_THRESH_LOW         0.80f
#define MOTION_THRESH_ACTIVE      1.60f

// Timing & Frequencies (in milliseconds)
#define TELEMETRY_INTERVAL_MS     2000   // Telemetry output & status evaluation rate
#define SENSOR_READ_INTERVAL_MS   100    // IMU sampling rate (10 Hz)
#define GPS_UPDATE_TIMEOUT_MS     5000   // Warning if GPS stream stalls
