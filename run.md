# GeoFence — Quick Setup & Run Guide (100% Free Plan)

No Cloud Functions or Blaze plan required. The ESP32 authenticates directly using Firebase Auth and writes telemetry to Firestore via the REST API.

---

## Step 1: Upload Firestore Rules

You can do this either in the Firebase Console or via CLI:

### Option A: Firebase Console (No CLI needed)
1. Open [Firestore Rules](https://console.firebase.google.com/project/dt-geofence/firestore/rules).
2. Copy the entire contents of `firestore.rules` from this project.
3. Paste into the editor and click **Publish**.

### Option B: Firebase CLI
```powershell
firebase deploy --only firestore:rules --project dt-geofence
```

---

## Step 2: Configure Hardware Secrets

1. Copy `hardware/include/Secrets.example.h` to `hardware/include/Secrets.h`:
```powershell
Copy-Item hardware\include\Secrets.example.h hardware\include\Secrets.h
```

2. Open `hardware/include/Secrets.h` and fill in your values:

```cpp
#pragma once

// Wi-Fi (2.4 GHz)
#define GEOFENCE_WIFI_SSID         "YOUR_WIFI_SSID"
#define GEOFENCE_WIFI_PASSWORD     "YOUR_WIFI_PASSWORD"

// Firebase credentials
#define GEOFENCE_FIREBASE_API_KEY  "AIzaSyCOd2UjkQ6xvCK-La7D4hPI2MmT6cP0lHc"
#define GEOFENCE_AUTH_EMAIL        "your_user@example.com"
#define GEOFENCE_AUTH_PASSWORD     "your_password"
#define GEOFENCE_PROJECT_ID        "dt-geofence"
#define GEOFENCE_OWNER_UID         "YOUR_UID"        // From Firebase Auth Console
#define GEOFENCE_PET_ID            "YOUR_PET_ID"     // From Firestore Console
```

### Where to get the values:
- **Email & UID**: [Firebase Auth Users](https://console.firebase.google.com/project/dt-geofence/authentication/users)
  *(Ensure Email/Password provider is enabled under [Sign-in Method](https://console.firebase.google.com/project/dt-geofence/authentication/providers))*
- **Pet ID**: [Firestore Database](https://console.firebase.google.com/project/dt-geofence/firestore/data) under `users/{YOUR_UID}/pets/{PET_ID}`.
  *(If you haven't created a pet yet, run the frontend with `npm run dev` in `frontend/`, sign in, and create your pet with Device ID `GF-2048-ESP32`)*

---

## Step 3: Flash the ESP32

1. Open the project in VS Code with PlatformIO.
2. Connect your ESP32 via USB.
3. Click **PlatformIO: Upload** (arrow icon in the bottom bar).
4. Open the **Serial Monitor** at **115200 baud**.

You will see:
```text
[WiFi] Connecting to ...
[Auth] Signed in to Firebase successfully.
[HTTPS] Firestore telemetry accepted (200).
```

Your React frontend will receive real-time updates directly from Firestore!
