#pragma once
#include <Arduino.h>
#include <math.h>

enum RiskState {
    RISK_SAFE = 0,
    RISK_CAUTION,
    RISK_HIGH_RISK,
    RISK_ESCAPED
};

class GeoUtils {
public:
    /**
     * Calculates geodesic distance in meters between two lat/lon coordinates
     * using the Haversine formula (matching frontend alertEngine.js).
     */
    static float haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        const double R = 6371000.0; // Earth radius in meters
        double dLat = (lat2 - lat1) * (M_PI / 180.0);
        double dLon = (lon2 - lon1) * (M_PI / 180.0);

        double a = sin(dLat / 2.0) * sin(dLat / 2.0) +
                   cos(lat1 * (M_PI / 180.0)) * cos(lat2 * (M_PI / 180.0)) *
                   sin(dLon / 2.0) * sin(dLon / 2.0);

        double c = 2.0 * atan2(sqrt(a), sqrt(1.0 - a));
        return (float)(R * c);
    }

    /**
     * Converts course degrees (0-360) into 8-point compass cardinal string
     */
    static const char* courseToCardinal(double courseDeg) {
        if (courseDeg < 0.0 || courseDeg > 360.0) return "N";
        int index = (int)((courseDeg + 22.5) / 45.0) % 8;
        static const char* directions[] = { "N", "NE", "E", "SE", "S", "SW", "W", "NW" };
        return directions[index];
    }

    /**
     * Evaluates boundary risk given current pet location and safe zone circle
     */
    static RiskState evaluateRisk(double petLat, double petLng,
                                 double centerLat, double centerLng,
                                 float zoneRadiusMeters, float warningDistMeters,
                                 float &distToCenterOut, float &distToBoundaryOut) {
        distToCenterOut = haversineMeters(petLat, petLng, centerLat, centerLng);
        distToBoundaryOut = zoneRadiusMeters - distToCenterOut;

        if (distToCenterOut > zoneRadiusMeters) {
            // Pet is outside safe zone perimeter -> ESCAPED / HIGH RISK
            return RISK_ESCAPED;
        } else if (distToBoundaryOut <= warningDistMeters) {
            // Pet is within warning threshold of boundary -> CAUTION
            return RISK_CAUTION;
        } else {
            // Well inside boundary -> SAFE
            return RISK_SAFE;
        }
    }

    static const char* riskStateToString(RiskState state) {
        switch (state) {
            case RISK_SAFE:      return "Safe";
            case RISK_CAUTION:   return "Caution";
            case RISK_HIGH_RISK: return "High Risk";
            case RISK_ESCAPED:   return "High Risk"; // Mapped to frontend 'High Risk'
            default:             return "Safe";
        }
    }

    static const char* riskLevelToFrontend(RiskState state) {
        switch (state) {
            case RISK_SAFE:      return "LOW";
            case RISK_CAUTION:   return "CAUTION";
            case RISK_HIGH_RISK: return "HIGH";
            case RISK_ESCAPED:   return "CRITICAL";
            default:             return "LOW";
        }
    }
};
