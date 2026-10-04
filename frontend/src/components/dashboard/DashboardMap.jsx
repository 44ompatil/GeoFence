import GoogleMapCanvas from '../maps/GoogleMapCanvas';

export default function DashboardMap({
  pets = [],
  selectedPet,
  onSelectPet,
  safeZones = [],
  onRecenter,
}) {
  return (
    <div className="w-full overflow-hidden rounded-3xl bg-white p-5 sm:p-6 shadow-sm border border-gray-200/80">
      {/* Header inside Map Card */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-bold text-gray-900">
          Live Map
        </h2>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
          <span className="h-2 w-2 rounded-full bg-[#15803D] animate-pulse" />
          <span>LIVE • GPS Tracking</span>
        </div>
      </div>

      {/* Map Canvas Area */}
      <div className="h-[360px] sm:h-[420px] lg:h-[480px] w-full">
        <GoogleMapCanvas
          pets={pets}
          selectedPet={selectedPet}
          onSelectPet={onSelectPet}
          safeZones={safeZones}
          onRecenter={onRecenter}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
