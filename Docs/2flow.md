                    SMART ANIMAL GEOFENCING SYSTEM
                    ──────────────────────────────

                         ANIMAL COLLAR / TAG
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
       ┌───────────┐      ┌────────────┐     ┌─────────────┐
       │   GPS     │      │    IMU     │     │   Battery   │
       │ NEO-6M    │      │  MPU6050   │     │   Supply    │
       │           │      │            │     │             │
       │ Latitude  │      │ Movement   │     │ Li-ion      │
       │ Longitude │      │ Accel.     │     │ Battery     │
       │ Speed     │      │ Gyroscope  │     │ + TP4056    │
       │ Course    │      │            │     │             │
       └─────┬─────┘      └─────┬──────┘     └──────┬──────┘
             │                  │                   │
             │                  │                   │
             ▼                  ▼                   ▼
       ┌─────────────────────────────────────────────────┐
       │                   ESP32                          │
       │              MAIN CONTROLLER                    │
       │                                                 │
       │  • Collects GPS + IMU data                      │
       │  • Validates sensor readings                    │
       │  • Calculates distance from boundary            │
       │  • Calculates speed & direction                 │
       │  • Determines movement status                   │
       │  • Calculates escape-risk level                 │
       └──────────────────────┬──────────────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │  RISK / DECISION  │
                    │      ENGINE       │
                    │                   │
                    │ SAFE              │
                    │ CAUTION           │
                    │ HIGH RISK         │
                    │ ESCAPED           │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼────────────────┐
              │               │                │
              ▼               ▼                ▼
        ┌──────────┐    ┌──────────┐     ┌──────────────┐
        │   LED    │    │  Buzzer  │     │ Bluetooth /  │
        │ Indicator│    │  Alert   │     │ Wi-Fi        │
        └──────────┘    └──────────┘     └──────┬───────┘
                                                │
                                                ▼
                                      ┌──────────────────┐
                                      │ Smartphone /     │
                                      │ Laptop Dashboard │
                                      │                  │
                                      │ Location         │
                                      │ Risk Level       │
                                      │ Boundary Status  │
                                      └──────────────────┘