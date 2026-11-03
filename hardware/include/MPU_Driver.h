#pragma once
#include <Arduino.h>
#include <Wire.h>
#include <math.h>

enum MpuChipType {
    MPU_CHIP_UNKNOWN = 0,
    MPU_CHIP_6050,
    MPU_CHIP_6500,
    MPU_CHIP_9250
};

struct MpuData {
    // Accelerometer in m/s^2
    float ax, ay, az;
    // Gyroscope in deg/s
    float gx, gy, gz;
    // Temperature in °C
    float temperature;
    // Acceleration magnitude (including 1g gravity)
    float totalAcceleration;
    // Dynamic motion acceleration (gravity subtracted: |total - 9.81|)
    float motionAcceleration;
    // Qualitative activity description
    String activity;
    // Tilt angles (in degrees)
    float pitch;
    float roll;
    bool isValid;
};

class UniversalMPU {
public:
    UniversalMPU() : 
        _i2cAddress(0x68),
        _chipType(MPU_CHIP_UNKNOWN),
        _whoAmI(0x00),
        _initialized(false) {}

    /**
     * Initialize I2C bus and wake up MPU6050 or MPU6500
     */
    bool begin(uint8_t sdaPin = 21, uint8_t sclPin = 22, uint32_t frequency = 400000) {
        Wire.begin(sdaPin, sclPin, frequency);

        // Try standard address 0x68, fallback to 0x69 if not found
        if (!detectAddress()) {
            return false;
        }

        // Read WHO_AM_I register (0x75)
        _whoAmI = readRegister8(_i2cAddress, 0x75);
        identifyChip(_whoAmI);

        // Wake up device: Write 0x00 to PWR_MGMT_1 (0x6B) to clear sleep bit
        writeRegister8(_i2cAddress, 0x6B, 0x00);
        delay(30);

        // Set clock source to PLL with X axis gyroscope reference (more stable than internal 8MHz)
        writeRegister8(_i2cAddress, 0x6B, 0x01);
        delay(10);

        // Enable all accelerometer & gyro axes: PWR_MGMT_2 (0x6C) = 0x00
        writeRegister8(_i2cAddress, 0x6C, 0x00);

        // Configure sample rate divider: SMPLRT_DIV (0x19) = 7 -> 1kHz / (1 + 7) = 125 Hz
        writeRegister8(_i2cAddress, 0x19, 0x07);

        // Configure DLPF (Digital Low Pass Filter): CONFIG (0x1A) = 3 -> ~44Hz bandwidth
        writeRegister8(_i2cAddress, 0x1A, 0x03);

        // Accelerometer range: ACCEL_CONFIG (0x1C) = 0x00 -> ±2g (16384 LSB/g)
        writeRegister8(_i2cAddress, 0x1C, 0x00);

        // Gyroscope range: GYRO_CONFIG (0x1B) = 0x00 -> ±250 °/s (131 LSB/(°/s))
        writeRegister8(_i2cAddress, 0x1B, 0x00);

        _initialized = true;
        return true;
    }

    /**
     * Reads all 6 axes + temperature in a single 14-byte atomic I2C burst transaction
     */
    bool read(MpuData &data) {
        if (!_initialized) {
            data.isValid = false;
            return false;
        }

        Wire.beginTransmission(_i2cAddress);
        Wire.write(0x3B); // Starting register: ACCEL_XOUT_H
        if (Wire.endTransmission(false) != 0) {
            data.isValid = false;
            return false;
        }

        // Request 14 contiguous bytes
        const uint8_t bytesExpected = 14;
        if (Wire.requestFrom(_i2cAddress, bytesExpected) != bytesExpected) {
            data.isValid = false;
            return false;
        }

        int16_t rawAx = (Wire.read() << 8) | Wire.read();
        int16_t rawAy = (Wire.read() << 8) | Wire.read();
        int16_t rawAz = (Wire.read() << 8) | Wire.read();
        int16_t rawTemp = (Wire.read() << 8) | Wire.read();
        int16_t rawGx = (Wire.read() << 8) | Wire.read();
        int16_t rawGy = (Wire.read() << 8) | Wire.read();
        int16_t rawGz = (Wire.read() << 8) | Wire.read();

        // Convert acceleration to m/s^2 (±2g range: 16384 LSB = 1g = 9.80665 m/s^2)
        const float accelScale = 9.80665f / 16384.0f;
        data.ax = rawAx * accelScale;
        data.ay = rawAy * accelScale;
        data.az = rawAz * accelScale;

        // Convert gyroscope to degrees/second (±250 dps range: 131 LSB = 1 °/s)
        const float gyroScale = 1.0f / 131.0f;
        data.gx = rawGx * gyroScale;
        data.gy = rawGy * gyroScale;
        data.gz = rawGz * gyroScale;

        // Temperature conversion depending on chip model
        if (_chipType == MPU_CHIP_6500 || _chipType == MPU_CHIP_9250) {
            data.temperature = ((float)rawTemp / 333.87f) + 21.0f;
        } else {
            // MPU-6050 formula
            data.temperature = ((float)rawTemp / 340.0f) + 36.53f;
        }

        // Compute total acceleration magnitude
        data.totalAcceleration = sqrtf(data.ax * data.ax + data.ay * data.ay + data.az * data.az);

        // Remove 1G static gravity vector (9.81 m/s^2) to isolate dynamic pet movement
        data.motionAcceleration = fabsf(data.totalAcceleration - 9.81f);

        // Classify activity score
        if (data.motionAcceleration < 0.25f) {
            data.activity = "STATIONARY";
        } else if (data.motionAcceleration < 0.80f) {
            data.activity = "LOW MOVEMENT";
        } else if (data.motionAcceleration < 1.60f) {
            data.activity = "ACTIVE";
        } else {
            data.activity = "HIGH MOVEMENT";
        }

        // Tilt angles (pitch and roll)
        data.pitch = atan2f(-data.ax, sqrtf(data.ay * data.ay + data.az * data.az)) * (180.0f / M_PI);
        data.roll  = atan2f(data.ay, data.az) * (180.0f / M_PI);

        data.isValid = true;
        return true;
    }

    uint8_t getAddress() const { return _i2cAddress; }
    uint8_t getWhoAmI() const { return _whoAmI; }
    MpuChipType getChipType() const { return _chipType; }

    const char* getChipName() const {
        switch (_chipType) {
            case MPU_CHIP_6050: return "MPU-6050";
            case MPU_CHIP_6500: return "MPU-6500";
            case MPU_CHIP_9250: return "MPU-9250 / ICM";
            default:            return "Unknown / Clone (Compatible)";
        }
    }

private:
    uint8_t _i2cAddress;
    MpuChipType _chipType;
    uint8_t _whoAmI;
    bool _initialized;

    bool detectAddress() {
        // Test standard 0x68
        Wire.beginTransmission(0x68);
        if (Wire.endTransmission() == 0) {
            _i2cAddress = 0x68;
            return true;
        }
        // Test alternate 0x69
        Wire.beginTransmission(0x69);
        if (Wire.endTransmission() == 0) {
            _i2cAddress = 0x69;
            return true;
        }
        return false;
    }

    void identifyChip(uint8_t id) {
        if (id == 0x68 || id == 0x69) {
            _chipType = MPU_CHIP_6050;
        } else if (id == 0x70) {
            _chipType = MPU_CHIP_6500;
        } else if (id == 0x71 || id == 0x73) {
            _chipType = MPU_CHIP_9250;
        } else {
            _chipType = MPU_CHIP_UNKNOWN;
        }
    }

    uint8_t readRegister8(uint8_t addr, uint8_t reg) {
        Wire.beginTransmission(addr);
        Wire.write(reg);
        if (Wire.endTransmission(false) != 0) return 0x00;
        if (Wire.requestFrom(addr, (uint8_t)1) == 1) {
            return Wire.read();
        }
        return 0x00;
    }

    void writeRegister8(uint8_t addr, uint8_t reg, uint8_t value) {
        Wire.beginTransmission(addr);
        Wire.write(reg);
        Wire.write(value);
        Wire.endTransmission();
    }
};
