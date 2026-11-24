import GoogleMapCanvas from "../maps/GoogleMapCanvas";
import { getPetLocationState } from "../../utils/petLocation";

export default function DashboardMap({
  pets = [],
  selectedPet,
  onSelectPet,
  safeZones = [],
  onRecenter,
}) {
  const selectedLocationState = getPetLocationState(selectedPet).status;
  const hasLiveFix = selectedLocationState === "live";
  const hasStaleFix = selectedLocationState === "stale";

  return (
    <div className="w-full overflow-hidden rounded-3xl bg-white p-5 sm:p-6 shadow-sm border border-gray-200/80">
      {/* Header inside Map Card */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-bold text-gray-900">
          Live Map
        </h2>
        <div
          className={`flex items-center gap-1.5 text-xs font-semibold ${hasLiveFix ? "text-[#15803D]" : hasStaleFix ? "text-amber-700" : "text-gray-500"}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${hasLiveFix ? "bg-[#15803D] animate-pulse" : hasStaleFix ? "bg-amber-500" : "bg-gray-400"}`}
          />
          <span>
            {hasLiveFix
              ? "LIVE • GPS Tracking"
              : hasStaleFix
                ? "STALE LOCATION"
                : "WAITING FOR GPS FIX"}
          </span>
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
