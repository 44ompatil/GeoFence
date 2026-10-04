import { X, AlertTriangle, ShieldOff } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';

export default function DeleteSafeZoneModal({
  isOpen,
  onClose,
  onConfirm,
  zone = null,
}) {
  if (!zone) return null;

  const assignedPetsText =
    zone.assignedPets && zone.assignedPets.length > 0
      ? zone.assignedPets.join(', ')
      : null;

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-md"
    >
      <div className="w-full rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-gray-200/80 overflow-y-auto max-h-[calc(100vh-3rem)]">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Delete Safe Zone?
              </h3>
              <p className="text-xs text-gray-500">Remove boundary &amp; rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 space-y-3">
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Are you sure you want to remove <span className="font-bold text-gray-900">{zone.name}</span>?
          </p>

          <div className="rounded-2xl bg-rose-50/70 p-3.5 border border-rose-100/90 flex items-start gap-2.5">
            <ShieldOff className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700 leading-normal">
              {assignedPetsText ? (
                <>
                  Pets currently assigned to this zone (<span className="font-semibold">{assignedPetsText}</span>) will no longer be tracked against this safety perimeter.
                </>
              ) : (
                <>This zone boundary and its safety perimeter rules will be permanently deleted.</>
              )}
            </p>
          </div>
        </div>

        {/* Modal Footer Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(zone);
              onClose();
            }}
            className="rounded-xl bg-[#DC2626] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#B91C1C] transition-colors cursor-pointer"
          >
            Delete Zone
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
