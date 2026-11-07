import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import AppLayout from "./components/layout/AppLayout";
import DashboardScreen from "./screens/DashboardScreen";
import SafeZonesScreen from "./screens/SafeZonesScreen";
import AlertsScreen from "./screens/AlertsScreen";
import SettingsScreen from "./screens/SettingsScreen";
import AuthScreen from "./screens/AuthScreen";
import { AuthProvider, useAuth } from "./context/AuthContext";
import {
  subscribePets,
  createPet,
  updatePet,
  deletePet,
} from "./services/firestore/pets";
import {
  subscribeSafeZones,
  createSafeZone,
  updateSafeZone,
  deleteSafeZone,
} from "./services/firestore/safeZones";
import {
  subscribeAlerts,
  markAlertResolved,
} from "./services/firestore/alerts";
import {
  DEFAULT_SETTINGS,
  subscribeSettings,
  ensureUserSettingsInitialized,
} from "./services/firestore/settings";
import {
  evaluatePetsAndGenerateAlerts,
  resetAlertEngineState,
} from "./services/alertEngine";

function AuthenticatedApp() {
  const { currentUser, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Shared Firestore-backed state (starts completely empty for every user)
  const [pets, setPets] = useState([]);
  const [safeZones, setSafeZones] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [petsLoading, setPetsLoading] = useState(true);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);

  const [selectedPetId, setSelectedPetId] = useState(null);

  // Prevent multiple initializations per user session
  const initializedUserRef = useRef(null);

  // 1. Subscribe to authenticated user's private Firestore subcollections & ensure defaults
  useEffect(() => {
    if (!currentUser?.uid) {
      setPets([]);
      setSafeZones([]);
      setAlerts([]);
      setSettings(DEFAULT_SETTINGS);
      setSelectedPetId(null);
      setPetsLoading(false);
      setZonesLoading(false);
      setAlertsLoading(false);
      resetAlertEngineState();
      initializedUserRef.current = null;
      return;
    }

    setPetsLoading(true);
    setZonesLoading(true);
    setAlertsLoading(true);

    // Initialize default Firestore documents if missing
    if (initializedUserRef.current !== currentUser.uid) {
      initializedUserRef.current = currentUser.uid;
      ensureUserSettingsInitialized(currentUser.uid, {
        displayName: currentUser.displayName,
        email: currentUser.email,
        photoURL: currentUser.photoURL,
      }).catch((err) => {
        console.error("[Firestore] User settings initialization error:", err);
      });
    }

    // Real-time listener for users/{uid}/pets
    const unsubscribePets = subscribePets(
      currentUser.uid,
      (loadedPets) => {
        setPets(loadedPets);
        setPetsLoading(false);
        // If selected pet was removed or none selected, update selection
        setSelectedPetId((prevId) => {
          if (prevId && loadedPets.some((p) => p.id === prevId)) {
            return prevId;
          }
          return loadedPets.length > 0 ? loadedPets[0].id : null;
        });
      },
      (error) => {
        console.error("Failed to subscribe to pets:", error);
        setPetsLoading(false);
      },
    );

    // Real-time listener for users/{uid}/safeZones
    const unsubscribeZones = subscribeSafeZones(
      currentUser.uid,
      (loadedZones) => {
        setSafeZones(loadedZones);
        setZonesLoading(false);
      },
      (error) => {
        console.error("Failed to subscribe to safe zones:", error);
        setZonesLoading(false);
      },
    );

    // Real-time listener for users/{uid}/alerts
    const unsubscribeAlerts = subscribeAlerts(
      currentUser.uid,
      (loadedAlerts) => {
        setAlerts(loadedAlerts);
        setAlertsLoading(false);
      },
      (error) => {
        console.error("Failed to subscribe to alerts:", error);
        setAlertsLoading(false);
      },
    );

    // Real-time listener for users/{uid}/settings/preferences
    const unsubscribeSettings = subscribeSettings(
      currentUser.uid,
      (loadedSettings) => {
        setSettings(loadedSettings);
      },
      (error) => {
        console.error("Failed to subscribe to settings:", error);
      },
    );

    return () => {
      unsubscribePets();
      unsubscribeZones();
      unsubscribeAlerts();
      unsubscribeSettings();
    };
  }, [currentUser?.uid]);

  // 2. Alert Engine: evaluate real pets against real safe zones & user settings
  useEffect(() => {
    if (!currentUser?.uid || petsLoading || zonesLoading) return;

    evaluatePetsAndGenerateAlerts({
      uid: currentUser.uid,
      pets,
      safeZones,
      settings,
    }).catch((err) => {
      console.error("[AlertEngine] Evaluation error:", err);
    });
  }, [currentUser?.uid, pets, safeZones, settings, petsLoading, zonesLoading]);

  // Loading state while Firebase auth state is being resolved
  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F6F5F0]">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0C5A37] text-white shadow-lg animate-pulse">
            <svg
              className="h-7 w-7 fill-white"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="8" cy="8.5" r="1.75" />
              <circle cx="16" cy="8.5" r="1.75" />
              <circle cx="5" cy="13" r="1.5" />
              <circle cx="19" cy="13" r="1.5" />
              <path d="M12 11.5c-2.4 0-4.2 1.8-4.2 3.8 0 1.6 1.1 2.9 2.5 3.5.5.2 1.1.2 1.7.2s1.2 0 1.7-.2c1.4-.6 2.5-1.9 2.5-3.5 0-2-1.8-3.8-4.2-3.8z" />
            </svg>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin text-[#00875A]" />
            <span>Connecting to GeoFence...</span>
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated user -> Show Login/Register AuthScreen
  if (!currentUser) {
    return <AuthScreen initialMode="login" />;
  }

  const selectedPet =
    pets.find((p) => p.id === selectedPetId) || pets[0] || null;
  const unresolvedAlertsCount = alerts.filter((a) => !a.resolved).length;

  // --- Firestore Pet Operations ---
  const handleAddPet = async (petData) => {
    if (!currentUser?.uid)
      return { success: false, error: "User unauthenticated" };
    if (safeZones.length === 0) {
      return {
        success: false,
        error: "Create a safe zone before adding a pet.",
      };
    }
    const result = await createPet(currentUser.uid, petData);
    if (result.success && result.pet) {
      if (!selectedPetId) {
        setSelectedPetId(result.pet.id);
      }
    }
    return result;
  };

  const handleUpdatePet = async (petId, petData) => {
    if (!currentUser?.uid)
      return { success: false, error: "User unauthenticated" };
    return await updatePet(currentUser.uid, petId, petData);
  };

  const handleDeletePet = async (petToDelete) => {
    if (!currentUser?.uid)
      return { success: false, error: "User unauthenticated" };
    const result = await deletePet(currentUser.uid, petToDelete.id);
    if (result.success) {
      if (selectedPetId === petToDelete.id) {
        const remaining = pets.filter((p) => p.id !== petToDelete.id);
        setSelectedPetId(remaining[0]?.id || null);
      }
    }
    return result;
  };

  // --- Firestore Safe Zone Operations ---
  const handleAddSafeZone = async (zoneData) => {
    if (!currentUser?.uid)
      return { success: false, error: "User unauthenticated" };
    return await createSafeZone(currentUser.uid, zoneData);
  };

  const handleUpdateSafeZone = async (zoneId, zoneData) => {
    if (!currentUser?.uid)
      return { success: false, error: "User unauthenticated" };
    return await updateSafeZone(currentUser.uid, zoneId, zoneData);
  };

  const handleDeleteSafeZone = async (zoneToDelete) => {
    if (!currentUser?.uid)
      return { success: false, error: "User unauthenticated" };
    return await deleteSafeZone(currentUser.uid, zoneToDelete.id);
  };

  // --- Firestore Alert Operations ---
  const handleResolveAlert = async (alertId) => {
    if (!currentUser?.uid)
      return { success: false, error: "User unauthenticated" };
    return await markAlertResolved(currentUser.uid, alertId);
  };

  const handleNavigateToAddSafeZone = () => {
    setActiveTab("zones");
  };

  return (
    <AppLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      unresolvedAlertsCount={unresolvedAlertsCount}
    >
      <div key={activeTab} className="animate-page-fade">
        {activeTab === "dashboard" && (
          <DashboardScreen
            pets={pets}
            setPets={setPets}
            safeZones={safeZones}
            alerts={alerts}
            selectedPet={selectedPet}
            setSelectedPet={(pet) => setSelectedPetId(pet?.id || null)}
            onAddSafeZone={handleNavigateToAddSafeZone}
            onAddPet={handleAddPet}
            onUpdatePet={handleUpdatePet}
            onDeletePet={handleDeletePet}
            petsLoading={petsLoading}
            zonesLoading={zonesLoading}
          />
        )}

        {activeTab === "zones" && (
          <SafeZonesScreen
            safeZones={safeZones}
            setSafeZones={setSafeZones}
            pets={pets}
            selectedPet={selectedPet}
            setSelectedPet={(pet) => setSelectedPetId(pet?.id || null)}
            onAddZone={handleAddSafeZone}
            onUpdateZone={handleUpdateSafeZone}
            onDeleteZone={handleDeleteSafeZone}
            zonesLoading={zonesLoading}
          />
        )}

        {activeTab === "alerts" && (
          <AlertsScreen alerts={alerts} onResolveAlert={handleResolveAlert} />
        )}

        {activeTab === "settings" && (
          <SettingsScreen pets={pets} onUpdatePet={handleUpdatePet} />
        )}
      </div>
    </AppLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
