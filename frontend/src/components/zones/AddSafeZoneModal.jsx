import { useState } from 'react';
import { X, ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';

export default function AddSafeZoneModal({
  isOpen,
  onClose,
  onSave,
  pets = [],
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Safe Zone'); // 'Safe Zone', 'Caution Buffer', 'Danger Perimeter'
  const [shape, setShape] = useState('Rectangular');
  const [warningBuffer, setWarningBuffer] = useState(20);
  const [selectedPets, setSelectedPets] = useState(pets.map((p) => p.name));
  const [soundBuzzer, setSoundBuzzer] = useState(true);
  const [sendPushAlert, setSendPushAlert] = useState(true);

  if (!isOpen) return null;

  const handleTogglePet = (petName) => {
    setSelectedPets((prev) =>
      prev.includes(petName)
        ? prev.filter((n) => n !== petName)
        : [...prev, petName]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    let badgeColor = '#005A36';
    let borderColor = '#005A36';
    let bgColor = 'rgba(0, 90, 54, 0.12)';
    let borderStyle = 'dashed';
    let status = 'Active';

    if (type === 'Caution Buffer') {
      badgeColor = '#E68A00';
      borderColor = '#E68A00';
      bgColor = 'rgba(230, 138, 0, 0.12)';
      borderStyle = 'dashed';
    } else if (type === 'Danger Perimeter') {
      badgeColor = '#D32F2F';
      borderColor = '#D32F2F';
      bgColor = 'rgba(211, 47, 47, 0.20)';
      borderStyle = 'solid';
      status = 'Restricted';
    }

    const randomLeft = 15 + Math.random() * 45;
    const randomTop = 20 + Math.random() * 40;

    const newZone = {
      id: `zone-${Date.now()}`,
      name: name.trim(),
      type,
      badgeColor,
      borderColor,
      bgColor,
      borderStyle,
      rect: {
        left: `${randomLeft}%`,
        top: `${randomTop}%`,
        width: '18%',
        height: '16%',
      },
      status,
      assignedPets: selectedPets,
      warningBuffer,
      alertRules: {
        soundBuzzer,
        sendPushAlert,
      },
    };

    onSave(newZone);
    onClose();
  };

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-lg"
    >
      <div className="w-full rounded-2xl bg-white p-6 shadow-xl border border-gray-100 overflow-y-auto max-h-[calc(100vh-3rem)]">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-base font-bold text-gray-900">
            Create New Safe Zone
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Zone Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Zone Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Backyard Garden"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#006C3B] focus:outline-none focus:ring-1 focus:ring-[#006C3B]"
            />
          </div>

          {/* Zone State / Classification */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Zone Type &amp; Risk Classification
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('Safe Zone')}
                className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center transition-all cursor-pointer ${
                  type === 'Safe Zone'
                    ? 'border-[#005A36] bg-[#005A36]/10 text-[#005A36] font-semibold'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ShieldCheck className="h-4 w-4 text-[#005A36]" />
                <span className="text-xs">Safe Zone</span>
              </button>

              <button
                type="button"
                onClick={() => setType('Caution Buffer')}
                className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center transition-all cursor-pointer ${
                  type === 'Caution Buffer'
                    ? 'border-[#E68A00] bg-[#E68A00]/10 text-[#E68A00] font-semibold'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <AlertTriangle className="h-4 w-4 text-[#E68A00]" />
                <span className="text-xs">Caution Buffer</span>
              </button>

              <button
                type="button"
                onClick={() => setType('Danger Perimeter')}
                className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center transition-all cursor-pointer ${
                  type === 'Danger Perimeter'
                    ? 'border-[#D32F2F] bg-[#D32F2F]/10 text-[#D32F2F] font-semibold'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ShieldAlert className="h-4 w-4 text-[#D32F2F]" />
                <span className="text-xs">Restricted</span>
              </button>
            </div>
          </div>

          {/* Shape and Warning Distance */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Geometry Shape
              </label>
              <select
                value={shape}
                onChange={(e) => setShape(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#006C3B] focus:outline-none focus:ring-1 focus:ring-[#006C3B] cursor-pointer"
              >
                <option value="Rectangular">Rectangular Area</option>
                <option value="Circular">Circular Perimeter</option>
                <option value="Polygon">Custom Polygon</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Warning Threshold (meters)
              </label>
              <input
                type="number"
                min="5"
                max="100"
                value={warningBuffer}
                onChange={(e) => setWarningBuffer(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#006C3B] focus:outline-none focus:ring-1 focus:ring-[#006C3B]"
              />
            </div>
          </div>

          {/* Assigned Pets */}
          {pets.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Assign Pets to Zone
              </label>
              <div className="flex flex-wrap gap-2">
                {pets.map((p) => {
                  const isAssigned = selectedPets.includes(p.name);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleTogglePet(p.name)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                        isAssigned
                          ? 'border-[#006C3B] bg-[#006C3B]/10 text-[#006C3B] font-semibold'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>🐕</span>
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Alert Behavior Toggles */}
          <div className="space-y-2 border-t border-gray-100 pt-3">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Safety Trigger Rules
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={soundBuzzer}
                onChange={(e) => setSoundBuzzer(e.target.checked)}
                className="rounded text-[#006C3B] focus:ring-[#006C3B]"
              />
              <span>Trigger collar buzzer when approaching boundary</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={sendPushAlert}
                onChange={(e) => setSendPushAlert(e.target.checked)}
                className="rounded text-[#006C3B] focus:ring-[#006C3B]"
              />
              <span>Send immediate warning alert upon breach</span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#006C3B] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#03542C] cursor-pointer"
            >
              Save Safe Zone
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}
