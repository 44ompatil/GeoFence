import { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import DashboardMap from '../components/dashboard/DashboardMap';
import PetCard from '../components/dashboard/PetCard';
import PetModal from '../components/dashboard/PetModal';
import PairTrackerModal from '../components/dashboard/PairTrackerModal';
import DeletePetModal from '../components/dashboard/DeletePetModal';

export default function DashboardScreen({
  pets = [],
  setPets,
  safeZones = [],
  alerts = [],
  selectedPet,
  setSelectedPet,
  onAddSafeZone,
  onAddPet,
  onUpdatePet,
  onDeletePet,
  petsLoading = false,
  zonesLoading = false,
}) {
  const [petModalOpen, setPetModalOpen] = useState(false);
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [pendingPet, setPendingPet] = useState(null);
  const [deletingPet, setDeletingPet] = useState(null);
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

  const handleAddPetClick = () => {
    setEditingPet(null);
    setPendingPet(null);
    setPetModalOpen(true);
  };

  const handleEditPet = (pet) => {
    setEditingPet(pet);
    setPendingPet(null);
    setPetModalOpen(true);
  };

  const handleDeletePetClick = (pet) => {
    setDeletingPet(pet);
  };

  const handleConfirmDelete = async (petToDelete) => {
    if (onDeletePet) {
      const result = await onDeletePet(petToDelete);
      if (result && !result.success) {
        showError(`Failed to delete pet: ${result.error || 'Unknown error'}`);
        setDeletingPet(null);
        return;
      }
      showFeedback(`Pet "${petToDelete.name}" deleted successfully.`);
    } else if (setPets) {
      const remaining = pets.filter((p) => p.id !== petToDelete.id);
      setPets(remaining);
      if (selectedPet?.id === petToDelete.id) {
        setSelectedPet(remaining[0] || null);
      }
    }
    setDeletingPet(null);
  };

  // Step 1: Pet Profile form completed (Create or Edit)
  const handleSavePetProfile = async (petData) => {
    if (editingPet) {
      // Edit existing pet profile
      if (onUpdatePet) {
        const result = await onUpdatePet(editingPet.id, petData);
        if (result && !result.success) {
          showError(`Failed to update pet: ${result.error || 'Unknown error'}`);
          return;
        }
        showFeedback(`Pet "${petData.name}" updated successfully.`);
      } else if (setPets) {
        setPets((prev) =>
          prev.map((p) => (p.id === petData.id ? { ...p, ...petData } : p))
        );
        if (selectedPet?.id === petData.id) {
          setSelectedPet((prev) => ({ ...prev, ...petData }));
        }
      }
      setEditingPet(null);
      setPetModalOpen(false);
    } else {
      // New pet: create profile draft and transition to Step 2 (Pair Tracker option)
      setPendingPet(petData);
      setPetModalOpen(false);
      setPairModalOpen(true);
    }
  };

  // Step 2: Tracker Paired -> Attach device to pet and add to Firestore
  const handlePairTracker = async ({ deviceId, deviceName, collarBattery }) => {
    if (pendingPet) {
      const fullPet = {
        ...pendingPet,
        deviceId: deviceId || null,
        deviceName: deviceName || null,
        collarBattery: collarBattery || 90,
      };

      if (onAddPet) {
        const result = await onAddPet(fullPet);
        if (result && !result.success) {
          showError(`Failed to save pet to Firestore: ${result.error || 'Unknown error'}`);
          setPairModalOpen(false);
          setPendingPet(null);
          return;
        }
        showFeedback(`Pet "${fullPet.name}" added to GeoFence!`);
      } else if (setPets) {
        setPets((prev) => [...prev, fullPet]);
        setSelectedPet(fullPet);
      }
      setPendingPet(null);
      setPairModalOpen(false);
    }
  };

  // User clicked "Back" during tracker pairing -> return to Pet form
  const handleBackToPetForm = () => {
    setPairModalOpen(false);
    if (pendingPet) {
      setEditingPet(pendingPet);
    }
    setPetModalOpen(true);
  };

  // User closed / skipped tracker pairing -> save pet to Firestore without a tracker
  const handleClosePairing = async () => {
    if (pendingPet) {
      const fullPet = {
        ...pendingPet,
        deviceId: null,
        deviceName: null,
        collarBattery: 90,
      };

      if (onAddPet) {
        const result = await onAddPet(fullPet);
        if (result && !result.success) {
          showError(`Failed to save pet to Firestore: ${result.error || 'Unknown error'}`);
          setPairModalOpen(false);
          setPendingPet(null);
          return;
        }
        showFeedback(`Pet "${fullPet.name}" added to GeoFence!`);
      } else if (setPets) {
        setPets((prev) => [...prev, fullPet]);
        setSelectedPet(fullPet);
      }
      setPendingPet(null);
    }
    setPairModalOpen(false);
  };

  const handleRecenter = () => {
    if (pets.length > 0 && !selectedPet) {
      setSelectedPet(pets[0]);
    }
  };

  return (
    <div className="space-y-6 relative">
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

      {/* 1. Live Map Card */}
      <DashboardMap
        pets={pets}
        selectedPet={selectedPet}
        onSelectPet={setSelectedPet}
        safeZones={safeZones}
        onRecenter={handleRecenter}
      />

      {/* 2. My Pets Section */}
      <section className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">
            My Pets
          </h2>
          <button
            onClick={handleAddPetClick}
            className="inline-flex items-center justify-center rounded-lg bg-[#006C3B] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#03542C] transition-colors focus:outline-none cursor-pointer"
          >
            Add Pet
          </button>
        </div>

        {/* Pet Cards Grid (4 columns on desktop) */}
        {petsLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center flex items-center justify-center gap-2 text-xs font-semibold text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin text-[#006C3B]" />
            <span>Loading pets from Firestore...</span>
          </div>
        ) : pets.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pets.map((pet) => (
              <PetCard
                key={pet.id}
                pet={pet}
                isSelected={selectedPet?.id === pet.id}
                onSelect={() => setSelectedPet(pet)}
                onEdit={handleEditPet}
                onDelete={handleDeletePetClick}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm font-semibold text-gray-700">No pets registered</p>
            <p className="text-xs text-gray-400 mt-1">
              Click &quot;Add Pet&quot; to link your first pet and GeoFence tracking collar.
            </p>
          </div>
        )}
      </section>

      {/* Step 1: Add / Edit Pet Profile Modal */}
      <PetModal
        isOpen={petModalOpen}
        onClose={() => {
          setPetModalOpen(false);
          setEditingPet(null);
          setPendingPet(null);
        }}
        onSave={handleSavePetProfile}
        editPet={editingPet}
      />

      {/* Step 2: Connect Pet's Tracker (Discovery & Pairing) */}
      <PairTrackerModal
        isOpen={pairModalOpen}
        onClose={handleClosePairing}
        onBack={handleBackToPetForm}
        onPair={handlePairTracker}
        pets={pets}
        pet={pendingPet}
        initialMode="pair"
      />

      {/* Delete Confirmation Modal */}
      <DeletePetModal
        isOpen={Boolean(deletingPet)}
        onClose={() => setDeletingPet(null)}
        onConfirm={handleConfirmDelete}
        pet={deletingPet}
      />
    </div>
  );
}
