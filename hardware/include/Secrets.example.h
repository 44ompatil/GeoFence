#pragma once

// Wi-Fi Configuration (2.4 GHz only)
#define GEOFENCE_WIFI_SSID         "your_wifi_ssid"
#define GEOFENCE_WIFI_PASSWORD     "your_wifi_password"

// Firebase Configuration (Free Spark Plan / Direct REST)
#define GEOFENCE_FIREBASE_API_KEY  "AIzaSyCOd2UjkQ6xvCK-La7D4hPI2MmT6cP0lHc"  // From .env or Project Settings
#define GEOFENCE_AUTH_EMAIL        "your_user_email@example.com"             // Firebase Auth User Email
#define GEOFENCE_AUTH_PASSWORD     "your_user_password"                      // Firebase Auth User Password
#define GEOFENCE_PROJECT_ID        "dt-geofence"                             // Firebase Project ID
#define GEOFENCE_OWNER_UID         "your_firebase_auth_uid"                  // User UID from Firebase Auth
#define GEOFENCE_PET_ID            "your_pet_document_id"                    // Pet Doc ID from Firestore users/{uid}/pets
