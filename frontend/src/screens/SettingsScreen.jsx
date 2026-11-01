import { useState, useEffect, useRef } from 'react';
import {
  User,
  Radio,
  Compass,
  Bell,
  Sparkles,
  Plus,
  RotateCcw,
  Check,
  Loader2,
  Plug,
  Unlink,
} from 'lucide-react';
import PairTrackerModal from '../components/dashboard/PairTrackerModal';
import DeleteAccountModal from '../components/settings/DeleteAccountModal';
import { useAuth } from '../context/AuthContext';
import {
  DEFAULT_SETTINGS,
  subscribeSettings,
  saveSettings,
} from '../services/firestore/settings';

/**
 * Accessible, responsive Toggle Switch Component
 */
function ToggleSwitch({ id, checked, onChange, disabled = false, ariaLabel }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#00875A] focus:ring-offset-2 ${
        checked ? 'bg-[#00875A]' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function SettingsScreen({ pets = [], onUpdatePet = null }) {
  const { currentUser, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('account');

  // Modals state
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [pairModalMode, setPairModalMode] = useState('pair'); // 'pair', 'manage', 'unpair'
  const [targetTrackerPet, setTargetTrackerPet] = useState(null);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  // Account State
  const [fullName, setFullName] = useState(currentUser?.displayName || 'Om Patil');
  const [email] = useState(currentUser?.email || 'ompatil@gmail.com');

  // Firestore-backed Settings States
  const [trackingSettings, setTrackingSettings] = useState(DEFAULT_SETTINGS.tracking);
  const [notifications, setNotifications] = useState(DEFAULT_SETTINGS.notifications);
  const [behaviour, setBehaviour] = useState(DEFAULT_SETTINGS.behaviour);

  // Status & Feedback
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingStatus, setSavingStatus] = useState(''); // 'saving', 'saved', 'error'
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Lock to avoid scroll-spy conflicts during programmatic click-to-scroll
  const isProgrammaticScrollRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  const showFeedback = (msg) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(''), 3500);
  };

  const navItems = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'devices', label: 'Pets & Connected Devices', icon: Radio },
    { id: 'tracking', label: 'Tracking', icon: Compass },
    { id: 'notifications', label: 'Alerts & Notifications', icon: Bell },
    { id: 'behaviour', label: 'Behaviour & Personalization', icon: Sparkles },
  ];

  // 1. Subscribe to Firestore Settings
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoadingSettings(false);
      return;
    }

    setLoadingSettings(true);
    const unsubscribe = subscribeSettings(
      currentUser.uid,
      (loadedSettings) => {
        setTrackingSettings(loadedSettings.tracking);
        setNotifications(loadedSettings.notifications);
        setBehaviour(loadedSettings.behaviour);
        setLoadingSettings(false);
      },
      (error) => {
        console.error('Settings subscription error:', error);
        setLoadingSettings(false);
        showFeedback('Failed to load cloud settings. Using defaults.');
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // 2. Scroll-Spy with window scroll listener
  useEffect(() => {
    const sectionIds = ['account', 'devices', 'tracking', 'notifications', 'behaviour'];
    const elements = sectionIds
      .map((id) => document.getElementById(`settings-sec-${id}`))
      .filter(Boolean);

    if (elements.length === 0) return;

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;

      const scrollPosition = window.scrollY + 180;
      let currentSection = sectionIds[0];

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const top = el.offsetTop;
        const height = el.offsetHeight;

        if (scrollPosition >= top && scrollPosition < top + height) {
          currentSection = sectionIds[i];
          break;
        } else if (scrollPosition >= top) {
          currentSection = sectionIds[i];
        }
      }

      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [loadingSettings]);

  const handleScrollTo = (sectionId) => {
    setActiveSection(sectionId);
    isProgrammaticScrollRef.current = true;

    const element = document.getElementById(`settings-sec-${sectionId}`);
    if (element) {
      const offsetTop = element.offsetTop - 90;
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth',
      });
    }

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 800);
  };

  // Helper to persist updates to Firestore
  const persistSettings = async (partialUpdate) => {
    if (!currentUser?.uid) return;

    setSavingStatus('saving');
    const result = await saveSettings(currentUser.uid, partialUpdate);
    if (result.success) {
      setSavingStatus('saved');
      setTimeout(() => setSavingStatus(''), 2000);
    } else {
      setSavingStatus('error');
      showFeedback('Could not save settings to Firestore: ' + (result.error || 'Permission error'));
      setTimeout(() => setSavingStatus(''), 4000);
    }
  };

  // --- Handlers for Tracking Settings ---
  const handleTrackingChange = (field, value) => {
    const updated = {
      ...trackingSettings,
      [field]: value,
    };
    setTrackingSettings(updated);
    persistSettings({ tracking: updated });
  };

  // --- Handlers for Notification Toggles ---
  const handleToggleNotification = (key) => {
    const updated = {
      ...notifications,
      [key]: !notifications[key],
    };
    setNotifications(updated);
    persistSettings({ notifications: updated });
  };

  // --- Handlers for Behaviour Toggles & Settings ---
  const handleToggleBehaviour = (key) => {
    const updated = {
      ...behaviour,
      [key]: !behaviour[key],
    };
    setBehaviour(updated);
    persistSettings({ behaviour: updated });
  };

  const handleBehaviourSelect = (field, value) => {
    const updated = {
      ...behaviour,
      [field]: value,
    };
    setBehaviour(updated);
    persistSettings({ behaviour: updated });
  };

  const handleResetLearnedBehaviour = async () => {
    const defaultBehaviour = DEFAULT_SETTINGS.behaviour;
    setBehaviour(defaultBehaviour);
    await persistSettings({ behaviour: defaultBehaviour });
    showFeedback('Learned behaviour profile has been reset to defaults.');
  };

  // --- Tracker Pairing / Unpairing in Firestore ---
  const handlePairDevice = async ({ petId, deviceId, deviceName, collarBattery, deviceStatus }) => {
    if (onUpdatePet && petId) {
      const result = await onUpdatePet(petId, {
        deviceId,
        deviceName,
        collarBattery: collarBattery || 90,
        deviceStatus: deviceStatus || 'Connected',
        syncTime: 'Just now',
      });
      if (result && !result.success) {
        showFeedback(`Failed to connect tracker: ${result.error}`);
        return;
      }
      showFeedback(`Device ${deviceId} linked successfully!`);
    }
  };

  const handleUnpairDevice = async (petId) => {
    if (onUpdatePet && petId) {
      const result = await onUpdatePet(petId, {
        deviceId: null,
        deviceName: null,
        collarBattery: null,
        deviceStatus: 'Unpaired',
        syncTime: null,
      });
      if (result && !result.success) {
        showFeedback(`Failed to unpair tracker: ${result.error}`);
        return;
      }
      showFeedback('Tracker disconnected successfully.');
    }
  };

  // Check if any registered pet has a tracker
  const pairedPets = pets.filter((p) => Boolean(p.deviceId || p.trackerId));
  const hasPairedDevices = pairedPets.length > 0;

  // Pet Names for display in Learned Profile
  const petNamesList = pets.length > 0
    ? pets.map((p) => p.name).join(' and ')
    : 'Your pets';

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 items-start pb-16">
      {/* Floating Status / Feedback Toast */}
      {feedbackMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-[#005A36] px-4 py-3 text-xs font-semibold text-white shadow-xl animate-fade-in">
          <Check className="h-4 w-4 shrink-0 text-emerald-300" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Save Status Indicator */}
      {savingStatus === 'saving' && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-full bg-white border border-gray-200 px-3.5 py-1.5 text-xs font-medium text-gray-600 shadow-md animate-fade-in">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#00875A]" />
          <span>Saving changes...</span>
        </div>
      )}
      {savingStatus === 'saved' && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-1.5 rounded-full bg-[#E6F4EA] border border-emerald-200 px-3.5 py-1.5 text-xs font-medium text-[#006C3B] shadow-md animate-fade-in">
          <Check className="h-3.5 w-3.5 text-[#006C3B]" />
          <span>Settings saved</span>
        </div>
      )}

      {/* Left Sticky Sidebar */}
      <aside className="w-full lg:w-60 xl:w-64 shrink-0 sticky top-20 z-10">
        <div className="rounded-2xl bg-white p-2.5 shadow-sm border border-gray-200/80">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => handleScrollTo(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#E6F4EA] text-[#006C3B] font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-[#006C3B]' : 'text-gray-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Settings Content Area */}
      <main className="flex-1 w-full rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-gray-200/80 space-y-9">
        {/* Settings Header */}
        <div className="border-b border-gray-100 pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Settings
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage your account, connected trackers, safety preferences and alerts.
          </p>
        </div>

        {/* Section 1: Account */}
        <section id="settings-sec-account" className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4.5 w-4.5 text-[#00875A]" />
            <h2 className="text-base font-bold text-gray-900">Account</h2>
          </div>
          <p className="text-xs text-gray-500 -mt-2">
            Profile information and account security.
          </p>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 pt-2">
            {/* User Avatar */}
            <div className="relative shrink-0">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EDE9FE] text-[#7C3AED] shadow-xs overflow-hidden">
                {currentUser?.photoURL ? (
                  <img src={currentUser.photoURL} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-8 w-8 stroke-[1.75]" />
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#00875A] text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>

            {/* Account Form Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 w-full">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-900 focus:border-[#00875A] focus:outline-none focus:ring-1 focus:ring-[#00875A] transition-colors"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full rounded-lg border border-gray-300 bg-gray-50/70 px-3 py-2 text-xs sm:text-sm text-gray-700 focus:outline-none"
                />
              </div>

              {/* Password */}
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    disabled
                    value="••••••••••••"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs sm:text-sm text-gray-500 tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => showFeedback('Password reset link sent to ' + email)}
                    className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Change Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Pets & Connected Devices */}
        <section id="settings-sec-devices" className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Radio className="h-4.5 w-4.5 text-[#00875A]" />
                <h2 className="text-base font-bold text-gray-900">
                  Pets & Connected Devices
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Link each pet to its physical GeoFence tracker.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setTargetTrackerPet(null);
                setPairModalMode('pair');
                setPairModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#00875A] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#007048] transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Pair Device</span>
            </button>
          </div>

          {/* Connected Trackers / Pets List */}
          <div className="space-y-3 pt-2">
            {pets.length > 0 ? (
              pets.map((pet, idx) => {
                const isPaired = Boolean(pet.deviceId || pet.trackerId);
                const trackerId = pet.deviceId || pet.trackerId;
                const battery = pet.collarBattery ?? (85 - idx * 10);
                const syncText = pet.syncTime || 'Synced recently';
                const petColor = pet.color || (idx % 2 === 0 ? '#B8865B' : '#A3704C');
                const initial = pet.name ? pet.name.charAt(0).toUpperCase() : 'P';

                return (
                  <div
                    key={pet.id || idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-[#F9FAF8] p-3.5 border border-gray-200/60"
                  >
                    {/* Left: Pet Avatar & Device Info */}
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white font-bold text-sm shadow-xs"
                        style={{ backgroundColor: petColor }}
                      >
                        {initial}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">
                          {pet.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {pet.breed || 'Pet'} • {isPaired ? `Tracker ${trackerId}` : 'No tracker paired'}
                        </p>
                      </div>
                    </div>

                    {/* Right: Status Pill & Sync Details */}
                    <div className="flex items-center gap-4">
                      {isPaired ? (
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-[#00875A] px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                            Connected
                          </span>
                          <span className="text-xs text-gray-500">
                            {battery}% battery
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-gray-500">
                            {syncText}
                          </span>
                        </div>
                      ) : (
                        <span className="rounded-md bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                          Unpaired
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setTargetTrackerPet(pet);
                          setPairModalMode(isPaired ? 'manage' : 'pair');
                          setPairModalOpen(true);
                        }}
                        className="text-xs font-semibold text-[#00875A] hover:underline cursor-pointer"
                      >
                        {isPaired ? 'Manage' : 'Pair'}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl bg-[#F9FAF8] p-6 text-center border border-dashed border-gray-300 text-xs text-gray-500">
                <p className="font-semibold text-gray-700">No pets or connected devices yet.</p>
                <p className="text-gray-400 mt-1">Add a pet from the Dashboard to link a GeoFence tracker.</p>
              </div>
            )}
          </div>
          <p className="text-[11px] text-gray-400">
            Firmware versions are shown per tracker in Manage Device.
          </p>
        </section>

        {/* Section 3: Tracking */}
        <section id="settings-sec-tracking" className="space-y-4 pt-4 border-t border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="h-4.5 w-4.5 text-[#00875A]" />
              <h2 className="text-base font-bold text-gray-900">Tracking</h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Control location updates, accuracy and battery use.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Location Update Interval */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Location update interval
              </label>
              <select
                id="select-location-interval"
                value={trackingSettings.locationInterval}
                onChange={(e) => handleTrackingChange('locationInterval', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-900 bg-white focus:border-[#00875A] focus:outline-none focus:ring-1 focus:ring-[#00875A] cursor-pointer"
              >
                <option value="Every 5 seconds">Every 5 seconds</option>
                <option value="Every 15 seconds">Every 15 seconds</option>
                <option value="Every 30 seconds">Every 30 seconds</option>
                <option value="Every 1 minute">Every 1 minute</option>
              </select>
            </div>

            {/* GPS Accuracy */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                GPS accuracy
              </label>
              <select
                id="select-gps-accuracy"
                value={trackingSettings.gpsAccuracy}
                onChange={(e) => handleTrackingChange('gpsAccuracy', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-900 bg-white focus:border-[#00875A] focus:outline-none focus:ring-1 focus:ring-[#00875A] cursor-pointer"
              >
                <option value="High accuracy">High accuracy</option>
                <option value="Standard accuracy">Standard accuracy</option>
                <option value="Battery optimized">Battery optimized</option>
              </select>
            </div>

            {/* Battery-Saving Mode */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Battery-saving mode
              </label>
              <select
                id="select-battery-mode"
                value={trackingSettings.batteryMode}
                onChange={(e) => handleTrackingChange('batteryMode', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-900 bg-white focus:border-[#00875A] focus:outline-none focus:ring-1 focus:ring-[#00875A] cursor-pointer"
              >
                <option value="Balanced">Balanced</option>
                <option value="Performance">Performance</option>
                <option value="Power Saver">Power Saver</option>
              </select>
            </div>

            {/* Time Format */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Time format
              </label>
              <select
                id="select-time-format"
                value={trackingSettings.timeFormat}
                onChange={(e) => handleTrackingChange('timeFormat', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-900 bg-white focus:border-[#00875A] focus:outline-none focus:ring-1 focus:ring-[#00875A] cursor-pointer"
              >
                <option value="24-hour">24-hour</option>
                <option value="12-hour">12-hour</option>
              </select>
            </div>

            {/* Boundary Warning Distance */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Boundary warning distance
              </label>
              <select
                id="select-boundary-warning"
                value={trackingSettings.boundaryWarning}
                onChange={(e) => handleTrackingChange('boundaryWarning', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-900 bg-white focus:border-[#00875A] focus:outline-none focus:ring-1 focus:ring-[#00875A] cursor-pointer"
              >
                <option value="10 m">10 m</option>
                <option value="15 m">15 m</option>
                <option value="20 m">20 m</option>
                <option value="30 m">30 m</option>
              </select>
            </div>
          </div>
        </section>

        {/* Section 4: Alerts & Notifications */}
        <section id="settings-sec-notifications" className="space-y-4 pt-4 border-t border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="h-4.5 w-4.5 text-[#00875A]" />
              <h2 className="text-base font-bold text-gray-900">
                Alerts & Notifications
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Choose the signals that deserve your attention.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Boundary Breach */}
            <div className="flex items-center justify-between rounded-xl bg-[#F9FAF8] p-3.5 border border-gray-200/60">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900">Boundary Breach</h3>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">When a pet leaves a safe zone</p>
              </div>
              <ToggleSwitch
                id="toggle-boundary-breach"
                ariaLabel="Boundary Breach"
                checked={notifications.boundaryBreach}
                onChange={() => handleToggleNotification('boundaryBreach')}
              />
            </div>

            {/* Approaching Boundary */}
            <div className="flex items-center justify-between rounded-xl bg-[#F9FAF8] p-3.5 border border-gray-200/60">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900">Approaching Boundary</h3>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">A heads-up before an exit</p>
              </div>
              <ToggleSwitch
                id="toggle-approaching-boundary"
                ariaLabel="Approaching Boundary"
                checked={notifications.approachingBoundary}
                onChange={() => handleToggleNotification('approachingBoundary')}
              />
            </div>

            {/* High-Risk Movement */}
            <div className="flex items-center justify-between rounded-xl bg-[#F9FAF8] p-3.5 border border-gray-200/60">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900">High-Risk Movement</h3>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">Unexpected speed or direction</p>
              </div>
              <ToggleSwitch
                id="toggle-high-risk-movement"
                ariaLabel="High-Risk Movement"
                checked={notifications.highRiskMovement}
                onChange={() => handleToggleNotification('highRiskMovement')}
              />
            </div>

            {/* Device Offline */}
            <div className="flex items-center justify-between rounded-xl bg-[#F9FAF8] p-3.5 border border-gray-200/60">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900">Device Offline</h3>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">Tracker has not checked in</p>
              </div>
              <ToggleSwitch
                id="toggle-device-offline"
                ariaLabel="Device Offline"
                checked={notifications.deviceOffline}
                onChange={() => handleToggleNotification('deviceOffline')}
              />
            </div>

            {/* Low Battery */}
            <div className="flex items-center justify-between rounded-xl bg-[#F9FAF8] p-3.5 border border-gray-200/60">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900">Low Battery</h3>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">Tracker battery is below 20%</p>
              </div>
              <ToggleSwitch
                id="toggle-low-battery"
                ariaLabel="Low Battery"
                checked={notifications.lowBattery}
                onChange={() => handleToggleNotification('lowBattery')}
              />
            </div>

            {/* Quiet Hours */}
            <div className="flex items-center justify-between rounded-xl bg-[#F9FAF8] p-3.5 border border-gray-200/60">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900">Quiet Hours</h3>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">Pause non-critical alerts overnight.</p>
              </div>
              <button
                type="button"
                onClick={() => showFeedback('Quiet Hours scheduled for 10 PM – 7 AM')}
                className="rounded-md bg-[#00875A] px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-[#007048] transition-colors cursor-pointer"
              >
                {notifications.quietHours || '10 PM – 7 AM'}
              </button>
            </div>
          </div>
        </section>

        {/* Section 5: Behaviour & Personalization */}
        <section id="settings-sec-behaviour" className="space-y-4 pt-4 border-t border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-[#00875A]" />
              <h2 className="text-base font-bold text-gray-900">
                Behaviour & Personalization
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Let GeoFence learn what is normal for each pet.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Behaviour Learning */}
            <div className="flex items-center justify-between rounded-xl bg-[#F9FAF8] p-3.5 border border-gray-200/60">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900">Behaviour learning</h3>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">Learn routines from movement history</p>
              </div>
              <ToggleSwitch
                id="toggle-behaviour-learning"
                ariaLabel="Behaviour Learning"
                checked={behaviour.learning}
                onChange={() => handleToggleBehaviour('learning')}
              />
            </div>

            {/* Adaptive Risk Detection */}
            <div className="flex items-center justify-between rounded-xl bg-[#F9FAF8] p-3.5 border border-gray-200/60">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900">Adaptive risk detection</h3>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">Personalize unusual movement alerts</p>
              </div>
              <ToggleSwitch
                id="toggle-adaptive-risk"
                ariaLabel="Adaptive Risk Detection"
                checked={behaviour.adaptiveRisk}
                onChange={() => handleToggleBehaviour('adaptiveRisk')}
              />
            </div>

            {/* Alert Sensitivity */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Alert sensitivity
              </label>
              <select
                id="select-alert-sensitivity"
                value={behaviour.alertSensitivity}
                onChange={(e) => handleBehaviourSelect('alertSensitivity', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-900 bg-white focus:border-[#00875A] focus:outline-none focus:ring-1 focus:ring-[#00875A] cursor-pointer"
              >
                <option value="Balanced">Balanced</option>
                <option value="High (Extra sensitive)">High (Extra sensitive)</option>
                <option value="Low (Essential only)">Low (Essential only)</option>
              </select>
            </div>

            {/* Learned Profile */}
            <div className="flex items-center justify-between rounded-xl bg-[#F9FAF8] p-3.5 border border-gray-200/60">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900">Learned profile</h3>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                  {petNamesList} have {behaviour.learnedProfileDays || 21} days of behaviour data.
                </p>
              </div>
              <span className="rounded-md bg-[#00875A] px-3 py-1 text-xs font-semibold text-white shadow-xs whitespace-nowrap">
                {behaviour.learnedProfileStatus || 'Learning active'}
              </span>
            </div>
          </div>

          {/* Reset Learned Behaviour Button */}
          <div className="pt-2">
            <button
              id="btn-reset-behaviour"
              type="button"
              onClick={handleResetLearnedBehaviour}
              className="w-full flex items-center justify-center gap-2 rounded-full border border-[#00875A] py-2 text-xs font-semibold text-[#00875A] hover:bg-[#00875A]/5 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset learned behaviour</span>
            </button>
          </div>
        </section>

        {/* Section 6: Account & Device */}
        <section className="rounded-2xl bg-[#F9FAF8] p-4.5 border border-gray-200/60 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Account & Device</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Manage your tracker connection or sign out of this account.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTargetTrackerPet(null);
                  setPairModalMode('pair');
                  setPairModalOpen(true);
                }}
                className="rounded-lg bg-[#00875A] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#007048] transition-colors cursor-pointer"
              >
                Pair Device
              </button>

              <button
                type="button"
                onClick={() => {
                  if (hasPairedDevices) {
                    setTargetTrackerPet(pairedPets[0]);
                    setPairModalMode('unpair');
                    setPairModalOpen(true);
                  } else {
                    showFeedback('No connected trackers found to unpair.');
                  }
                }}
                disabled={!hasPairedDevices}
                className="rounded-lg border border-red-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Unpair Device
              </button>
            </div>

            <button
              id="settings-logout-btn"
              type="button"
              onClick={async () => {
                showFeedback('Logging out...');
                await logout();
              }}
              className="rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </section>

        {/* Section 7: Delete Account (Destructive Action) */}
        <section className="rounded-2xl bg-[#FEF2F2] p-4.5 border border-red-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-red-800">Delete Account</h3>
            <p className="text-xs text-red-600 mt-0.5">
              Permanently delete your GeoFence account and all associated data.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setDeleteAccountOpen(true)}
            className="rounded-lg bg-[#DC2626] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#B91C1C] transition-colors shrink-0 cursor-pointer"
          >
            Delete Account
          </button>
        </section>
      </main>

      {/* Central Device Management / Pair Tracker Modal */}
      <PairTrackerModal
        isOpen={pairModalOpen}
        onClose={() => setPairModalOpen(false)}
        pets={pets}
        pet={targetTrackerPet}
        initialMode={pairModalMode}
        onPair={handlePairDevice}
        onUnpair={handleUnpairDevice}
      />

      {/* Delete Account Confirmation Modal */}
      <DeleteAccountModal
        isOpen={deleteAccountOpen}
        onClose={() => setDeleteAccountOpen(false)}
      />
    </div>
  );
}
