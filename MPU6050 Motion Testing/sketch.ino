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
  Serial.println("ANIMAL GEOFENCING - MOTION TEST");
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

  // Get acceleration values
  float ax = acceleration.acceleration.x;
  float ay = acceleration.acceleration.y;
  float az = acceleration.acceleration.z;

  // Calculate total acceleration magnitude
  float totalAcceleration =
      sqrt(ax * ax + ay * ay + az * az);

  // Remove approximately 1 g of gravity
  float motionAcceleration =
      fabs(totalAcceleration - 9.81);

  Serial.print("Total Acceleration: ");
  Serial.print(totalAcceleration);
  Serial.println(" m/s^2");

  Serial.print("Motion Acceleration: ");
  Serial.print(motionAcceleration);
  Serial.println(" m/s^2");

  // Simple movement threshold
  if (motionAcceleration > 0.50) {
    Serial.println("STATUS: MOVING");
  }
  else {
    Serial.println("STATUS: STATIONARY");
  }

  Serial.println("--------------------------------");

  delay(500);
}