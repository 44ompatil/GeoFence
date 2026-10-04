import { useState, useEffect } from 'react';
import {
  X,
  Radio,
  Check,
  RefreshCw,
  Cpu,
  Unlink,
  AlertTriangle,
  ChevronDown,
  Loader2,
  Plug,
} from 'lucide-react';
import ModalPortal from '../common/ModalPortal';

// Predefined list of realistic GeoFence & ESP32 tracking hardware
const AVAILABLE_TRACKERS_CATALOG = [
  {
    id: 'GF-101-872',
    name: 'GeoFence Tracker v2',
    signal: 'Strong (-45 dBm)',
    battery: '94%',
    batteryNum: 94,
  },
  {
    id: 'GF-102-431',
    name: 'GeoFence Tracker v2',
    signal: 'Good (-62 dBm)',
    battery: '78%',
    batteryNum: 78,
  },
  {
    id: 'GF-2048-ESP32',
    name: 'ESP32 Smart Collar',
    signal: 'Strong (-50 dBm)',
    battery: '88%',
    batteryNum: 88,
  },
  {
    id: 'GF-309-880',
    name: 'GeoFence Collar Pro',
    signal: 'Excellent (-38 dBm)',
    battery: '96%',
    batteryNum: 96,
  },
];

export default function PairTrackerModal({
  isOpen,
  onClose,
  pets = [],
  pet = null,
  initialMode = 'pair', // 'pair', 'manage', 'unpair'
  onPair = null,
  onUnpair = null,
}) {
  const [selectedPetId, setSelectedPetId] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceName, setDeviceName] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [showUnpairConfirm, setShowUnpairConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'selectDevice'

  // Determine current active pet
  const activePet = pets.find((p) => p.id === selectedPetId) || pet || pets[0] || null;

  useEffect(() => {
    if (isOpen) {
      const initialPetId = pet?.id || (pets.length > 0 ? pets[0].id : '');
      setSelectedPetId(initialPetId);
      setShowUnpairConfirm(initialMode === 'unpair');
      setIsProcessing(false);

      const currentPet = pets.find((p) => p.id === initialPetId) || pet;
      const isAlreadyPaired = Boolean(currentPet?.deviceId || currentPet?.trackerId);

      if (isAlreadyPaired && initialMode !== 'pair') {
        setViewMode('overview');
      } else {
        setViewMode('selectDevice');
        triggerScan();
      }

      setDeviceName(currentPet?.name ? `${currentPet.name}'s collar` : '');
    }
  }, [isOpen, pet, initialMode, pets]);

  const triggerScan = () => {
    setIsScanning(true);
    setSelectedDevice(null);
    const timer = setTimeout(() => {
      setIsScanning(false);
      // Auto-select first available tracker not paired to any other pet
      const currentPet = pets.find((p) => p.id === selectedPetId) || pet;
      const availableDev = AVAILABLE_TRACKERS_CATALOG.find((dev) => {
        const pairedOther = pets.some(
          (p) => (p.deviceId === dev.id || p.trackerId === dev.id) && p.id !== currentPet?.id
        );
        return !pairedOther;
      });
      if (availableDev) {
        setSelectedDevice(availableDev);
      }
    }, 600);
    return () => clearTimeout(timer);
  };

  const currentPetHasTracker = Boolean(activePet?.deviceId || activePet?.trackerId);
  const currentTrackerId = activePet?.deviceId || activePet?.trackerId;

  const handlePetChange = (petId) => {
    setSelectedPetId(petId);
    setShowUnpairConfirm(false);
    const newPet = pets.find((p) => p.id === petId);
    if (newPet?.deviceId || newPet?.trackerId) {
      setViewMode('overview');
    } else {
      setViewMode('selectDevice');
      triggerScan();
    }
  };

  const handlePairSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDevice || !activePet || isProcessing) return;

    setIsProcessing(true);
    try {
      const finalDeviceName =
        deviceName.trim() || `${activePet.name}'s Tracker`;

      if (onPair) {
        await onPair({
          petId: activePet.id,
          deviceId: selectedDevice.id,
          deviceName: finalDeviceName,
          collarBattery: selectedDevice.batteryNum || 90,
          deviceStatus: 'Connected',
        });
      }
      onClose();
    } catch (err) {
      console.error('Pairing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmUnpair = async () => {
    if (!activePet || isProcessing) return;

    setIsProcessing(true);
    try {
      if (onUnpair) {
        await onUnpair(activePet.id);
      } else if (onPair) {
        // Fallback clear device
        await onPair({
          petId: activePet.id,
          deviceId: null,
          deviceName: null,
          collarBattery: null,
          deviceStatus: 'Unpaired',
        });
      }
      setShowUnpairConfirm(false);
      onClose();
    } catch (err) {
      console.error('Unpairing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdrop={!isProcessing}
      closeOnEsc={!isProcessing}
      maxWidthClass="max-w-[480px]"
    >
      <div className="w-full rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-gray-200/90 overflow-y-auto max-h-[calc(100vh-3rem)]">
        {/* Top Header */}
        <div className="flex items-start justify-between pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#00875A]">
                <Radio className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-gray-900">
                Device Management
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Connect or manage GeoFence hardware trackers for your pets.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-xl border border-gray-200 p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Pet Selection Dropdown (Real Firestore Pets) */}
        <div className="pt-4 pb-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Select Registered Pet
          </label>
          {pets.length > 0 ? (
            <div className="relative">
              <select
                value={activePet?.id || ''}
                onChange={(e) => handlePetChange(e.target.value)}
                disabled={isProcessing}
                className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 pr-10 text-xs sm:text-sm font-semibold text-gray-900 focus:border-[#00875A] focus:outline-none focus:ring-1 focus:ring-[#00875A] cursor-pointer"
              >
                {pets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.breed ? `(${p.breed})` : ''} {p.deviceId ? `— Tracker: ${p.deviceId}` : '— [No Tracker]'}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-3 h-4 w-4 text-gray-400" />
            </div>
          ) : (
            <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500 border border-gray-200">
              No pets added yet. Add a pet first to link a tracker.
            </div>
          )}
        </div>

        {/* State A: Unpair Confirmation Screen */}
        {showUnpairConfirm && activePet && (
          <div className="py-4 space-y-4 animate-fade-in">
            <div className="rounded-2xl bg-amber-50/80 p-4 border border-amber-200/80 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0" />
                <span>Unpair Tracker from {activePet.name}?</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                This will disconnect hardware tracker <strong className="text-gray-900">{currentTrackerId || 'GF-101-872'}</strong> from <strong className="text-gray-900">{activePet.name}</strong>.
                The device will become immediately available to pair with any other pet.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowUnpairConfirm(false)}
                disabled={isProcessing}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUnpair}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                    <span>Unpairing...</span>
                  </>
                ) : (
                  <>
                    <Unlink className="h-3.5 w-3.5" />
                    <span>Unpair Tracker</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* State B: Current Pet Tracker Overview */}
        {!showUnpairConfirm && viewMode === 'overview' && activePet && (
          <div className="py-3 space-y-4 animate-fade-in">
            <div className="rounded-2xl bg-[#F9FAF8] p-4 border border-gray-200/80">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Current Hardware Link
                </span>
                <span className="rounded-md bg-[#00875A] px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  Connected
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00875A] text-white shadow-xs">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">
                    {activePet.deviceName || `${activePet.name}'s Tracker`}
                  </h4>
                  <p className="text-xs text-gray-500">
                    Device ID: <strong className="text-gray-700">{currentTrackerId}</strong> • {activePet.collarBattery || 90}% battery
                  </p>
                </div>
              </div>
            </div>

            {/* Management Actions */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setViewMode('selectDevice');
                  triggerScan();
                }}
                className="w-full rounded-xl border border-[#00875A] bg-white py-2.5 text-xs font-semibold text-[#00875A] hover:bg-[#00875A]/5 transition-colors cursor-pointer"
              >
                Change Tracker
              </button>
              <button
                type="button"
                onClick={() => setShowUnpairConfirm(true)}
                className="w-full rounded-xl border border-red-200 bg-white py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                Unpair Tracker
              </button>
            </div>
          </div>
        )}

        {/* State C: Scanner & Available Devices List */}
        {!showUnpairConfirm && viewMode === 'selectDevice' && activePet && (
          <form onSubmit={handlePairSubmit} className="space-y-4 pt-2 animate-fade-in">
            {/* Scanner Status Box */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span
                      className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isScanning ? 'animate-ping bg-[#00875A]' : 'bg-[#00875A]'
                      }`}
                    />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#00875A]" />
                  </span>
                  <span className="text-xs font-semibold text-gray-800">
                    {isScanning
                      ? 'Scanning for nearby trackers...'
                      : 'Available GeoFence / ESP32 Trackers'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={triggerScan}
                  disabled={isScanning}
                  className="text-[11px] font-semibold text-[#00875A] hover:text-[#006C3B] flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Scanning...' : 'Rescan'}</span>
                </button>
              </div>

              {/* List of Trackers */}
              {isScanning ? (
                <div className="py-6 flex flex-col items-center justify-center text-center">
                  <div className="relative flex items-center justify-center">
                    <div className="h-10 w-10 rounded-full border-2 border-[#00875A]/20 border-t-[#00875A] animate-spin" />
                    <Radio className="absolute h-4 w-4 text-[#00875A]" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 font-medium">
                    Detecting collar signals in range...
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {AVAILABLE_TRACKERS_CATALOG.map((dev) => {
                    const isSelected = selectedDevice?.id === dev.id;

                    // Check if paired to another pet
                    const pairedOtherPet = pets.find(
                      (p) =>
                        (p.deviceId === dev.id || p.trackerId === dev.id) &&
                        p.id !== activePet.id
                    );

                    const isCurrentPetDevice =
                      currentTrackerId === dev.id;

                    const isUnavailable = Boolean(pairedOtherPet);

                    return (
                      <button
                        key={dev.id}
                        type="button"
                        disabled={isUnavailable}
                        onClick={() => setSelectedDevice(dev)}
                        className={`w-full flex items-center justify-between rounded-xl p-2.5 text-left border transition-all cursor-pointer ${
                          isUnavailable
                            ? 'border-gray-200 bg-gray-100/70 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'border-[#00875A] bg-[#E6F4EA] shadow-2xs'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                              isSelected
                                ? 'bg-[#00875A] text-white'
                                : isUnavailable
                                ? 'bg-gray-200 text-gray-400'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            <Cpu className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-gray-900 tracking-tight">
                                {dev.id}
                              </span>
                              {isUnavailable ? (
                                <span className="rounded-md bg-gray-200 px-1.5 py-0.2 text-[10px] font-semibold text-gray-700">
                                  Paired to {pairedOtherPet.name}
                                </span>
                              ) : isCurrentPetDevice ? (
                                <span className="rounded-md bg-emerald-100 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-800">
                                  Current Tracker
                                </span>
                              ) : (
                                <span className="rounded-md bg-emerald-50 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-700">
                                  Available
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {dev.name} • {dev.battery} battery • {dev.signal}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00875A] text-white shadow-2xs">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Device Name Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Custom Tracker Name
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Plug className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder={`e.g. ${activePet.name}'s Tracker`}
                  className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2 text-xs sm:text-sm text-gray-900 focus:border-[#00875A] focus:outline-none focus:ring-1 focus:ring-[#00875A]"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              {currentPetHasTracker && (
                <button
                  type="button"
                  onClick={() => setViewMode('overview')}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={isScanning || !selectedDevice || isProcessing}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#00875A] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#007048] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>{currentPetHasTracker ? 'Update Tracker' : 'Pair Device'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalPortal>
  );
}
