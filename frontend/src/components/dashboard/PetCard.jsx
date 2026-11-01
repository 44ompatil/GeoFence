import { Compass, Zap, Pencil, Trash2 } from 'lucide-react';

export default function PetCard({
  pet,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}) {
  const isCaution = pet.status?.toLowerCase() === 'caution';
  const initial = pet.initial || pet.name?.charAt(0) || 'P';

  return (
    <div
      onClick={onSelect}
      className={`group relative flex flex-col justify-between rounded-2xl p-4 transition-all cursor-pointer ${
        isSelected
          ? 'border-2 border-[#006C3B] bg-[#F7FAF7] shadow-sm ring-1 ring-[#006C3B]/20'
          : 'border border-gray-200/90 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      {/* Top Details Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Avatar Photo or Initial Circle */}
          {pet.photo ? (
            <img
              src={pet.photo}
              alt={pet.name}
              className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-gray-100 shadow-xs"
            />
          ) : (
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white font-bold text-base shadow-sm"
              style={{ backgroundColor: pet.color || '#B8865B' }}
            >
              {initial}
            </div>
          )}

          {/* Name, Breed, Status */}
          <div>
            <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">
              {pet.name}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 leading-tight">
              {pet.breed || pet.type || 'Pet'}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
              <span
                className={`h-2 w-2 rounded-full ${
                  isCaution ? 'bg-[#E68A00]' : 'bg-[#006C3B]'
                }`}
              />
              <span className={isCaution ? 'text-[#E68A00]' : 'text-[#006C3B]'}>
                {pet.status}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Edit and Delete */}
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onEdit(pet)}
            aria-label={`Edit ${pet.name}`}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(pet)}
            aria-label={`Delete ${pet.name}`}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Telemetry Row */}
      <div className="mt-4 border-t border-gray-100 pt-3 flex items-center justify-between text-xs text-gray-600">
        {/* Heading */}
        <div className="flex items-center gap-1 font-medium">
          <Compass className="h-3.5 w-3.5 text-gray-500" />
          <span>{pet.heading || 'NE'}</span>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-1 font-medium">
          <Zap className="h-3.5 w-3.5 text-gray-500" />
          <span>{pet.speed || '0.0 km/h'}</span>
        </div>

        {/* Risk Badge */}
        <div>
          {isCaution ? (
            <span className="rounded-md bg-[#E68A00] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide shadow-xs">
              CAUTION
            </span>
          ) : (
            <span className="rounded-md bg-[#005A36] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide shadow-xs">
              LOW
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
