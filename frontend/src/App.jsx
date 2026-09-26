import { Activity, BellRing, MapPinned, ShieldCheck } from 'lucide-react';
import { animalStatus, riskStates, telemetry } from './data/mockData';

const statusColors = {
  SAFE: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  CAUTION: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
  'HIGH RISK': 'border-orange-500/40 bg-orange-500/10 text-orange-200',
  ESCAPED: 'border-red-500/40 bg-red-500/10 text-red-200',
};

function App() {
  const activeRisk = riskStates.find((risk) => risk.label === animalStatus.riskLevel) || riskStates[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-700 bg-slate-900/80 p-6 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">Animal Tracking</p>
            <h1 className="mt-2 text-3xl font-bold text-white">GeoFence Dashboard</h1>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-cyan-200">
            <ShieldCheck className="h-5 w-5" />
            <span>Collar status: {animalStatus.deviceId}</span>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Current risk</p>
              <BellRing className="h-5 w-5 text-cyan-400" />
            </div>
            <div className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase ${statusColors[animalStatus.riskLevel]}`}>
              {animalStatus.riskLevel}
            </div>
            <p className="mt-4 text-sm text-slate-300">{activeRisk.description}</p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Last signal</p>
              <MapPinned className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="mt-4 text-3xl font-bold text-white">{animalStatus.lastSeen}</p>
            <p className="mt-2 text-sm text-slate-300">{animalStatus.latitude.toFixed(4)}, {animalStatus.longitude.toFixed(4)}</p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Battery</p>
              <Activity className="h-5 w-5 text-violet-400" />
            </div>
            <p className="mt-4 text-3xl font-bold text-white">{animalStatus.battery}%</p>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500"
                style={{ width: `${animalStatus.battery}%` }}
              />
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Telemetry</h2>
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                Connected
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {telemetry.map((item) => (
                <div key={item.metric} className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400">{item.metric}</p>
                  <p className="mt-3 text-lg font-semibold text-white">{item.value}</p>
                  <span className="mt-2 inline-flex rounded-full bg-slate-700 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-300">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold text-white">Risk states</h2>
            <div className="mt-5 space-y-4">
              {riskStates.map((risk) => (
                <div
                  key={risk.label}
                  className={`flex items-start gap-3 rounded-2xl border p-3 ${
                    risk.label === animalStatus.riskLevel
                      ? 'border-slate-500 bg-slate-800'
                      : 'border-slate-700 bg-slate-800/60'
                  }`}
                >
                  <span className={`mt-1 inline-block h-3 w-3 rounded-full ${risk.color}`} />
                  <div>
                    <p className="text-sm font-semibold uppercase text-white">{risk.label}</p>
                    <p className="mt-1 text-sm text-slate-300">{risk.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
