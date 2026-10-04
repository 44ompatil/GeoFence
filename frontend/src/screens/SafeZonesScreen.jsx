import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import SafeZonesMap from '../components/zones/SafeZonesMap';
import AddSafeZoneScreen from './AddSafeZoneScreen';
import DeleteSafeZoneModal from '../components/zones/DeleteSafeZoneModal';

export default function SafeZonesScreen({
  safeZones = [],
  setSafeZones,
  pets = [],
  selectedPet,
  setSelectedPet,
  initialAddingZone = false,
  onAddZone,
  onUpdateZone,
  onDeleteZone,
  zonesLoading = false,
}) {
  const [isAddingZone, setIsAddingZone] = useState(initialAddingZone);
  const [editingZone, setEditingZone] = useState(null);
  const [deletingZone, setDeletingZone] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const showFeedback = (msg) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(''), 4000);
  };

  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 6000);
  };

  const handleAddZoneClick = () => {
    setEditingZone(null);
    setIsAddingZone(true);
  };

  const handleEditZone = (zone) => {
    setEditingZone(zone);
    setIsAddingZone(true);
  };

  const handleDeleteZoneClick = (zone) => {
    setDeletingZone(zone);
  };

  const handleConfirmDelete = async (zoneToDelete) => {
    if (onDeleteZone) {
      const result = await onDeleteZone(zoneToDelete);
      if (result && !result.success) {
        showError(`Failed to delete safe zone: ${result.error || 'Unknown error'}`);
        setDeletingZone(null);
        return;
      }
      showFeedback(`Safe zone "${zoneToDelete.name}" deleted.`);
    } else if (setSafeZones) {
      setSafeZones((prev) => prev.filter((z) => z.id !== zoneToDelete.id));
    }
    setDeletingZone(null);
  };

  const handleCancelAddOrEdit = () => {
    setIsAddingZone(false);
    setEditingZone(null);
  };

  const handleSaveZone = async (savedZone) => {
    if (editingZone) {
      // Update existing safe zone in Firestore
      if (onUpdateZone) {
        const result = await onUpdateZone(editingZone.id, savedZone);
        if (result && !result.success) {
          showError(`Failed to update safe zone: ${result.error || 'Unknown error'}`);
          return;
        }
        showFeedback(`Safe zone "${savedZone.name}" updated!`);
      } else if (setSafeZones) {
        setSafeZones((prev) =>
          prev.map((z) => (z.id === savedZone.id ? savedZone : z))
        );
      }
    } else {
      // Add new safe zone in Firestore
      if (onAddZone) {
        const result = await onAddZone(savedZone);
        if (result && !result.success) {
          showError(`Failed to save safe zone to Firestore: ${result.error || 'Unknown error'}`);
          return;
        }
        showFeedback(`Safe zone "${savedZone.name}" created successfully!`);
      } else if (setSafeZones) {
        setSafeZones((prev) => [...prev, savedZone]);
      }
    }
    setIsAddingZone(false);
    setEditingZone(null);
  };

  const handleRecenter = () => {
    if (pets.length > 0 && !selectedPet) {
      setSelectedPet(pets[0]);
    }
  };

  if (isAddingZone) {
    return (
      <div className="animate-page-fade">
        <AddSafeZoneScreen
          onCancel={handleCancelAddOrEdit}
          onSave={handleSaveZone}
          safeZones={safeZones}
          pets={pets}
          selectedPet={selectedPet}
          onSelectPet={setSelectedPet}
          editZone={editingZone}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      {/* Toast / Alert Feedback */}
      {errorMessage && (
        <div className="rounded-xl bg-red-50 p-3.5 border border-red-200 text-xs text-red-800 flex items-center gap-2 animate-fade-in shadow-md">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {feedbackMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#005A36] px-4 py-2.5 text-xs font-semibold text-white shadow-lg animate-fade-in">
          {feedbackMessage}
        </div>
      )}

      {/* Safe Zones Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
            Safe Zones
          </h1>
          {safeZones.length === 0 && !zonesLoading && (
            <p className="text-xs text-gray-500 mt-0.5">
              No safe zones configured yet. Draw a circular or polygon zone to protect your pets.
            </p>
          )}
        </div>
        <button
          onClick={handleAddZoneClick}
          className="inline-flex items-center justify-center rounded-lg bg-[#006C3B] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#03542C] transition-colors focus:outline-none cursor-pointer"
        >
          Add Safe Zone
        </button>
      </div>

      {/* Large Safe Zones Map matching Figma with Edit and Delete controls */}
      <SafeZonesMap
        safeZones={safeZones}
        pets={pets}
        selectedPet={selectedPet || pets[0]}
        onSelectPet={setSelectedPet}
        onRecenter={handleRecenter}
        onEditZone={handleEditZone}
        onDeleteZone={handleDeleteZoneClick}
      />

      {/* Delete Safe Zone Confirmation Modal */}
      <DeleteSafeZoneModal
        isOpen={Boolean(deletingZone)}
        onClose={() => setDeletingZone(null)}
        onConfirm={handleConfirmDelete}
        zone={deletingZone}
      />
    </div>
  );
}
