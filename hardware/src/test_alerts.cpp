/**
 * ============================================================================
 * UNIT TEST: ALERT OUTPUT MODULE (LEDS + BUZZER)
 * Target Board: ESP32 DevKit V1 (ESP-WROOM-32)
 * Connections:
 *   ESP32 GPIO 25 -> 220Ω Resistor -> Green LED Anode (+) -> Cathode to GND
 *   ESP32 GPIO 26 -> 220Ω Resistor -> Yellow/Blue LED Anode (+) -> Cathode to GND
 *   ESP32 GPIO 27 -> 220Ω Resistor -> Red LED Anode (+) -> Cathode to GND
 *   ESP32 GPIO 14 -> Buzzer (+) -> Buzzer (-) to GND
 * ============================================================================
 */

#include <Arduino.h>
#include "Config.h"

void setOutputs(bool green, bool yellow, bool red, bool buzzer) {
    digitalWrite(PIN_LED_GREEN, green ? HIGH : LOW);
    digitalWrite(PIN_LED_YELLOW, yellow ? HIGH : LOW);
    digitalWrite(PIN_LED_RED, red ? HIGH : LOW);
    digitalWrite(PIN_BUZZER, buzzer ? HIGH : LOW);
}

void setup() {
    Serial.begin(115200);
    delay(1000);

    pinMode(PIN_LED_GREEN, OUTPUT);
    pinMode(PIN_LED_YELLOW, OUTPUT);
    pinMode(PIN_LED_RED, OUTPUT);
    pinMode(PIN_BUZZER, OUTPUT);

    // Initial state: all OFF
    setOutputs(false, false, false, false);

    Serial.println("\n=======================================================");
    Serial.println("  ESP32 DevKit V1 - ALERT OUTPUT MODULE TEST");
    Serial.println("=======================================================");
    Serial.println("Pin Mapping:");
    Serial.println("  Green LED  : GPIO 25");
    Serial.println("  Yellow LED : GPIO 26");
    Serial.println("  Red LED    : GPIO 27");
    Serial.println("  Buzzer     : GPIO 14");
    Serial.println("Cycling through simulated Geofence Risk states every 3 seconds...\n");
}

void loop() {
    // -------------------------------------------------------------
    // 1. STATE: SAFE (Inside safe zone, normal movement)
    // -------------------------------------------------------------
    Serial.println("[STATE] >>> SAFE <<<");
    Serial.println("  Condition: Pet well inside boundary.");
    Serial.println("  Action   : Green LED ON, Buzzer OFF.\n");
    setOutputs(true, false, false, false);
    delay(3000);

    // -------------------------------------------------------------
    // 2. STATE: CAUTION (Approaching boundary warning zone)
    // -------------------------------------------------------------
    Serial.println("[STATE] >>> CAUTION <<<");
    Serial.println("  Condition: Pet within 15 meters of boundary.");
    Serial.println("  Action   : Yellow LED ON, Single Warning Chirp.\n");
    setOutputs(false, true, false, false);
    // Subtle single chirp (150ms)
    digitalWrite(PIN_BUZZER, HIGH);
    delay(150);
    digitalWrite(PIN_BUZZER, LOW);
    delay(2850);

    // -------------------------------------------------------------
    // 3. STATE: HIGH RISK / BREACH (Pet exited safe zone)
    // -------------------------------------------------------------
    Serial.println("[STATE] >>> HIGH RISK / BOUNDARY BREACH <<<");
    Serial.println("  Condition: Pet has breached boundary perimeter!");
    Serial.println("  Action   : Red LED Blinking, Pulsing Audible Alarm.\n");
    // Pulse Red LED and Buzzer for 3 seconds
    for (int i = 0; i < 6; i++) {
        setOutputs(false, false, true, true);
        delay(250);
        setOutputs(false, false, false, false);
        delay(250);
    }

    // -------------------------------------------------------------
    // 4. REST PERIOD
    // -------------------------------------------------------------
    Serial.println("[STATE] All Indicators OFF (1 sec reset)\n");
    setOutputs(false, false, false, false);
    delay(1000);
}
