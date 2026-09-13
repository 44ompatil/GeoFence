#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

Adafruit_MPU6050 mpu;

void setup() {

  Serial.begin(115200);

  // Start I2C
  Wire.begin(21, 22);

  Serial.println();
  Serial.println("================================");
  Serial.println("MPU6050 SENSOR TEST");
  Serial.println("================================");

  // Initialize MPU6050
  if (!mpu.begin()) {
    Serial.println("MPU6050 NOT FOUND!");
    
    while (1) {
      delay(10);
    }
  }

  Serial.println("MPU6050 FOUND!");
  Serial.println("Sensor initialized successfully.");
  Serial.println();
}

void loop() {

  sensors_event_t acceleration;
  sensors_event_t gyro;
  sensors_event_t temperature;

  // Read sensor
  mpu.getEvent(&acceleration, &gyro, &temperature);

  // Accelerometer
  Serial.print("Acceleration X: ");
  Serial.print(acceleration.acceleration.x);
  Serial.print(" m/s^2 | ");

  Serial.print("Y: ");
  Serial.print(acceleration.acceleration.y);
  Serial.print(" m/s^2 | ");

  Serial.print("Z: ");
  Serial.print(acceleration.acceleration.z);
  Serial.println(" m/s^2");

  // Gyroscope
  Serial.print("Gyro X: ");
  Serial.print(gyro.gyro.x);
  Serial.print(" rad/s | ");

  Serial.print("Y: ");
  Serial.print(gyro.gyro.y);
  Serial.print(" rad/s | ");

  Serial.print("Z: ");
  Serial.print(gyro.gyro.z);
  Serial.println(" rad/s");

  // Temperature
  Serial.print("Temperature: ");
  Serial.print(temperature.temperature);
  Serial.println(" °C");

  Serial.println("--------------------------------");

  delay(500);
}