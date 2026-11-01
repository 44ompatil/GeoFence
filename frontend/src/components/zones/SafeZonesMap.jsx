import GoogleMapCanvas from '../maps/GoogleMapCanvas';

export default function SafeZonesMap({
  safeZones = [],
  pets = [],
  selectedPet,
  onSelectPet,
  onRecenter,
  onEditZone,
  onDeleteZone,
}) {
  return (
    <div className="relative h-[560px] sm:h-[640px] lg:h-[700px] w-full overflow-hidden rounded-3xl bg-[#DFE5D5] shadow-sm border border-gray-200/80">
      <GoogleMapCanvas
        pets={pets}
        selectedPet={selectedPet}
        onSelectPet={onSelectPet}
        safeZones={safeZones}
        onEditZone={onEditZone}
        onDeleteZone={onDeleteZone}
        onRecenter={onRecenter}
        className="h-full w-full"
      />
    </div>
  );
}
