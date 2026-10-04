import { Plus, HeartPulse } from 'lucide-react';

export default function PetsScreen({ pets, onSelectPet }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            My Pets
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your registered animals, collar pairings, and active trackers.
          </p>
        </div>

        <button className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors">
          <Plus className="h-4 w-4" />
          <span>Register New Pet</span>
        </button>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900 shadow-soft">
        <HeartPulse className="mx-auto h-12 w-12 text-brand-500" />
        <h3 className="mt-3 text-lg font-bold text-slate-800 dark:text-white">
          My Pets Screen Shell
        </h3>
        <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
          Currently managing {pets.length} pets with active hardware telemetry. Full pet profiles and activity graphs will be rendered in Phase 3.
        </p>
      </div>
    </div>
  );
}
