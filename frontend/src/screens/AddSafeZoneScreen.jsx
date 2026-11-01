import { useState, useEffect } from 'react';
import {
  Check,
  ChevronDown,
} from 'lucide-react';
import GoogleMapCanvas from '../components/maps/GoogleMapCanvas';

const DEFAULT_CENTER = { lat: 18.6445, lng: 73.7550 };

export default function AddSafeZoneScreen({
  onCancel,
  onSave,
  safeZones = [],
  pets = [],
  selectedPet = null,
  onSelectPet,
  editZone = null,
}) {
  const isEditing = Boolean(editZone);

  const [zoneName, setZoneName] = useState('Home');
  const [zoneType, setZoneType] = useState('Circle'); // 'Circle' or 'Polygon'
  const [radius, setRadius] = useState('50 m');
  const [boundaryWarning, setBoundaryWarning] = useState('15 m');
  const [selectedPets, setSelectedPets] = useState([]);
  const [approachesBoundary, setApproachesBoundary] = useState(true);
  const [leavesSafeZone, setLeavesSafeZone] = useState(true);

  // Real GPS center coordinates
  const [center, setCenter] = useState(DEFAULT_CENTER);

  // Real GPS polygon points
  const [polygonPoints, setPolygonPoints] = useState([
    { lat: 18.6465, lng: 73.7530 },
    { lat: 18.6475, lng: 73.7570 },
    { lat: 18.6440, lng: 73.7585 },
    { lat: 18.6425, lng: 73.7545 },
  ]);

  const [nameError, setNameError] = useState('');

  // Extract radius in meters
  const radiusMeters = parseInt(radius, 10) || 50;

  // Initialize form state from editZone
  useEffect(() => {
    if (editZone) {
      setZoneName(editZone.name || 'Home');
      setZoneType(
        editZone.shape || (editZone.borderStyle === 'solid' ? 'Polygon' : 'Circle')
      );
      setRadius(
        editZone.radius ||
          (editZone.radiusMeters ? `${editZone.radiusMeters} m` : '50 m')
      );
      setBoundaryWarning(
        editZone.warningDistance || `${editZone.warningBuffer || 15} m`
      );
      setSelectedPets(editZone.assignedPets || []);
      setApproachesBoundary(
        editZone.alertBehavior?.approachesBoundary ?? true
      );
      setLeavesSafeZone(editZone.alertBehavior?.leavesSafeZone ?? true);

      if (editZone.center?.lat && editZone.center?.lng) {
        setCenter({ lat: editZone.center.lat, lng: editZone.center.lng });
      }

      if (editZone.polygonPoints?.length) {
        setPolygonPoints(editZone.polygonPoints);
      }
    } else {
      setZoneName('Home');
      setZoneType('Circle');
      setRadius('50 m');
      setBoundaryWarning('15 m');

      const availableNames = pets.map((p) => p.name);
      setSelectedPets(availableNames);

      setApproachesBoundary(true);
      setLeavesSafeZone(true);
      setCenter(DEFAULT_CENTER);
    }
    setNameError('');
  }, [editZone, pets]);

  // Toggle Pet Selection
  const handleTogglePet = (petName) => {
    setSelectedPets((prev) =>
      prev.includes(petName)
        ? prev.filter((name) => name !== petName)
        : [...prev, petName]
    );
  };

  // Form Submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!zoneName.trim()) {
      setNameError('Zone name is required');
      return;
    }

    const updatedZone = {
      ...(editZone || {}),
      id: editZone?.id || `zone-${Date.now()}`,
      name: zoneName.trim(),
      shape: zoneType,
      type: editZone?.type || 'Safe Zone',
      center: { ...center },
      radius,
      radiusMeters,
      polygonPoints: zoneType === 'Polygon' ? polygonPoints : null,
      warningDistance: boundaryWarning,
      assignedPets: selectedPets,
      alertBehavior: {
        approachesBoundary,
        leavesSafeZone,
      },
      badgeColor: editZone?.badgeColor || '#005A36',
      borderColor: editZone?.borderColor || '#005A36',
      bgColor: editZone?.bgColor || 'rgba(0, 90, 54, 0.14)',
      borderStyle: 'dashed',
      status: editZone?.status || 'Active',
    };

    onSave(updatedZone);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            {isEditing ? 'Edit Safe Zone' : 'Add Safe Zone'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            {isEditing
              ? `Update the safe roaming perimeter and safety rules for ${editZone?.name || 'this zone'}.`
              : 'Draw an area where your pet can safely roam.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="text-xs sm:text-sm font-medium text-[#006C3B] hover:text-[#03542C] hover:underline transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {/* Main 2-Column Content: Map (Left) + Form (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Real Google Map Canvas */}
        <div className="lg:col-span-8 w-full">
          <div className="relative h-[560px] sm:h-[620px] lg:h-[660px] w-full overflow-hidden rounded-3xl bg-[#DFE5D5] shadow-sm border border-gray-200/80">
            <GoogleMapCanvas
              center={center}
              pets={pets}
              selectedPet={selectedPet}
              onSelectPet={onSelectPet}
              safeZones={safeZones}
              interactiveZone={{
                mode: zoneType,
                center,
                radius: radiusMeters,
                zoneName,
                onCenterChange: setCenter,
                polygonPoints,
                onPolygonPointsChange: setPolygonPoints,
                editingZoneId: editZone?.id,
              }}
              className="h-full w-full"
            />
          </div>
        </div>

        {/* Right Column: "Create / Edit Safe Zone" Form Panel */}
        <div className="lg:col-span-4 w-full">
          <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-sm border border-gray-200/80">
            {/* Card Header */}
            <div>
              <h2 className="text-xl font-bold tracking-tight text-gray-900">
                {isEditing ? 'Edit Safe Zone' : 'Create Safe Zone'}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {isEditing
                  ? 'Update zone configuration and assigned pets.'
                  : 'Define an area where your pet can safely roam.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-5">
              {/* Field 1: Zone Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Zone Name
                </label>
                <input
                  type="text"
                  value={zoneName}
                  onChange={(e) => {
                    setZoneName(e.target.value);
                    if (nameError) setNameError('');
                  }}
                  placeholder="e.g. Home"
                  className={`w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 ${
                    nameError
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-gray-200 focus:border-[#006C3B] focus:ring-[#006C3B]'
                  }`}
                />
                {nameError && (
                  <p className="mt-1 text-[11px] font-medium text-rose-500">
                    {nameError}
                  </p>
                )}
              </div>

              {/* Field 2: Zone Type (Circle / Polygon Pill Buttons) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Zone Type
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoneType('Circle')}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      zoneType === 'Circle'
                        ? 'bg-[#005A36] text-white shadow-2xs'
                        : 'border border-[#005A36] text-gray-700 bg-white hover:bg-gray-50'
                    }`}
                  >
                    Circle
                  </button>

                  <button
                    type="button"
                    onClick={() => setZoneType('Polygon')}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      zoneType === 'Polygon'
                        ? 'bg-[#005A36] text-white shadow-2xs'
                        : 'border border-[#005A36] text-gray-700 bg-white hover:bg-gray-50'
                    }`}
                  >
                    Polygon
                  </button>
                </div>
              </div>

              {/* Field 3: Radius (Shown when Circle is selected) */}
              {zoneType === 'Circle' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Radius
                  </label>
                  <div className="relative">
                    <select
                      value={radius}
                      onChange={(e) => setRadius(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 focus:border-[#006C3B] focus:outline-none focus:ring-1 focus:ring-[#006C3B]"
                    >
                      <option value="20 m">20 m</option>
                      <option value="30 m">30 m</option>
                      <option value="50 m">50 m</option>
                      <option value="75 m">75 m</option>
                      <option value="100 m">100 m</option>
                      <option value="150 m">150 m</option>
                      <option value="200 m">200 m</option>
                      <option value="500 m">500 m</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              )}

              {/* Field 4: Boundary Warning Distance */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Boundary Warning
                </label>
                <div className="relative">
                  <select
                    value={boundaryWarning}
                    onChange={(e) => setBoundaryWarning(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 focus:border-[#006C3B] focus:outline-none focus:ring-1 focus:ring-[#006C3B]"
                  >
                    <option value="5 m">5 m</option>
                    <option value="10 m">10 m</option>
                    <option value="15 m">15 m</option>
                    <option value="20 m">20 m</option>
                    <option value="30 m">30 m</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Field 5: Pets Covered Checkboxes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Pets Covered
                </label>
                <div className="space-y-2">
                  {pets.length > 0 ? (
                    pets.map((p) => {
                      const isChecked = selectedPets.includes(p.name);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleTogglePet(p.name)}
                          className="flex items-center gap-2.5 text-xs text-gray-800 cursor-pointer select-none group w-full text-left"
                        >
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded transition-colors ${
                              isChecked
                                ? 'bg-[#005A36] text-white'
                                : 'border border-gray-300 bg-white group-hover:border-gray-400'
                            }`}
                          >
                            {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <span className="font-medium">{p.name}</span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      No pets registered yet. All future pets will be assigned by default.
                    </p>
                  )}
                </div>
              </div>

              {/* Field 6: Alert Behavior Checkboxes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Alert behavior
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setApproachesBoundary(!approachesBoundary)}
                    className="flex items-center gap-2.5 text-xs text-gray-800 cursor-pointer select-none group w-full text-left"
                  >
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded transition-colors ${
                        approachesBoundary
                          ? 'bg-[#005A36] text-white'
                          : 'border border-gray-300 bg-white group-hover:border-gray-400'
                      }`}
                    >
                      {approachesBoundary && (
                        <Check className="h-3 w-3 stroke-[3]" />
                      )}
                    </div>
                    <span className="font-medium">Approaches boundary</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLeavesSafeZone(!leavesSafeZone)}
                    className="flex items-center gap-2.5 text-xs text-gray-800 cursor-pointer select-none group w-full text-left"
                  >
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded transition-colors ${
                        leavesSafeZone
                          ? 'bg-[#005A36] text-white'
                          : 'border border-gray-300 bg-white group-hover:border-gray-400'
                      }`}
                    >
                      {leavesSafeZone && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <span className="font-medium">Leaves safe zone</span>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-[#006C3B] py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#03542C] active:scale-[0.99] transition-all cursor-pointer focus:outline-none"
                >
                  {isEditing ? 'Save Changes' : 'Save Safe Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
