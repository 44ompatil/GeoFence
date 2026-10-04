export default function StatusBadge({ status = 'Active', variant = 'default' }) {
  const getBadgeStyle = () => {
    switch (status.toLowerCase()) {
      case 'safe in zone':
      case 'safe':
      case 'active':
      case 'connected':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      case 'approaching fence':
      case 'caution':
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      case 'escaped':
      case 'high risk':
      case 'critical':
      case 'unresolved':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
      case 'resting':
      case 'stationary':
      case 'inactive':
      case 'resolved':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getBadgeStyle()}`}
    >
      {status}
    </span>
  );
}
