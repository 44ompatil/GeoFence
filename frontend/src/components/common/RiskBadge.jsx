import { ShieldCheck, AlertTriangle, AlertOctagon, ShieldAlert } from 'lucide-react';

const riskConfig = {
  SAFE: {
    label: 'SAFE',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    dotClass: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
    icon: ShieldCheck,
  },
  CAUTION: {
    label: 'CAUTION',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    dotClass: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
    icon: AlertTriangle,
  },
  HIGH_RISK: {
    label: 'HIGH RISK',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800',
    dotClass: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]',
    icon: AlertOctagon,
  },
  ESCAPED: {
    label: 'ESCAPED',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 animate-pulse',
    dotClass: 'bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.8)]',
    icon: ShieldAlert,
  },
};

export default function RiskBadge({ riskLevel = 'SAFE', showIcon = true, size = 'md' }) {
  const normalizedKey = (riskLevel || '').toUpperCase().replace(/[\s\/-]+/g, '_');
  const config = riskConfig[normalizedKey] || riskConfig.SAFE;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold tracking-wide',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold tracking-wider',
  }[size] || 'text-xs px-2.5 py-1 gap-1.5 font-semibold';

  return (
    <span
      className={`inline-flex items-center rounded-full border transition-colors ${config.badgeClass} ${sizeClasses}`}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${config.dotClass}`} />
      {showIcon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
}
