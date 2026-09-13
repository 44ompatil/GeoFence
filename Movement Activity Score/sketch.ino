#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <math.h>

Adafruit_MPU6050 mpu;

void setup() {

  Serial.begin(115200);

  Wire.begin(21, 22);

  Serial.println();
  Serial.println("================================");
  Serial.println("ANIMAL GEOFENCING");
  Serial.println("MPU6050 ACTIVITY TEST");
  Serial.println("================================");

  if (!mpu.begin()) {
    Serial.println("MPU6050 NOT FOUND!");

    while (1) {
      delay(10);
    }
  }

  Serial.println("MPU6050 FOUND!");
  Serial.println();
}

void loop() {

  sensors_event_t acceleration;
  sensors_event_t gyro;
  sensors_event_t temperature;

  mpu.getEvent(&acceleration, &gyro, &temperature);

  // Read acceleration
  float ax = acceleration.acceleration.x;
  float ay = acceleration.acceleration.y;
  float az = acceleration.acceleration.z;

  // Calculate total acceleration
  float totalAcceleration =
      sqrt(ax * ax + ay * ay + az * az);

  // Remove gravity
  float motionAcceleration =
      fabs(totalAcceleration - 9.81);

  // Determine activity level
  String activity;

  if (motionAcceleration < 0.20) {
    activity = "STATIONARY";
  }
  else if (motionAcceleration < 0.75) {
    activity = "LOW MOVEMENT";
  }
  else if (motionAcceleration < 1.50) {
    activity = "ACTIVE";
  }
  else {
    activity = "HIGH MOVEMENT";
  }

  // Display results
  Serial.print("Acceleration Magnitude: ");
  Serial.print(totalAcceleration);
  Serial.println(" m/s^2");

  Serial.print("Motion Level: ");
  Serial.print(motionAcceleration);
  Serial.println(" m/s^2");

  Serial.print("Activity: ");
  Serial.println(activity);

  Serial.println("--------------------------------");

  delay(500);
}