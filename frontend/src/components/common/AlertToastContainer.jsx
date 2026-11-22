import { useEffect } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  Battery,
  WifiOff,
  Activity,
  X,
  ExternalLink,
} from 'lucide-react';

/**
 * Individual Toast Notification for an Alert.
 */
function AlertToastItem({ alert, onDismiss, onNavigate }) {
  const isCritical =
    alert.severity?.toUpperCase() === 'CRITICAL' ||
    alert.type === 'BOUNDARY_BREACH' ||
    alert.severity?.toUpperCase() === 'ESCAPED';

  const isHighRisk =
    alert.severity?.toUpperCase() === 'HIGH RISK' ||
    alert.severity?.toUpperCase() === 'HIGH' ||
    alert.type === 'HIGH_RISK_MOVEMENT' ||
    alert.type === 'DEVICE_OFFLINE';

  // Auto-dismiss after 6.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(alert.id);
    }, 6500);
    return () => clearTimeout(timer);
  }, [alert.id, onDismiss]);

  const getIcon = () => {
    if (alert.type === 'LOW_BATTERY') return <Battery className="h-5 w-5 text-amber-600" />;
    if (alert.type === 'DEVICE_OFFLINE') return <WifiOff className="h-5 w-5 text-orange-600" />;
    if (alert.type === 'HIGH_RISK_MOVEMENT') return <Activity className="h-5 w-5 text-orange-600" />;
    if (isCritical) return <ShieldAlert className="h-5 w-5 text-red-600" />;
    return <AlertCircle className="h-5 w-5 text-amber-600" />;
  };

  const getStyle = () => {
    if (isCritical) {
      return {
        cardBg: 'bg-red-50/95 border-red-300 text-red-950',
        badgeBg: 'bg-red-600 text-white',
        iconBg: 'bg-red-100',
        pingBg: 'bg-red-500',
        ringColor: 'ring-red-200',
      };
    }
    if (isHighRisk) {
      return {
        cardBg: 'bg-orange-50/95 border-orange-300 text-orange-950',
        badgeBg: 'bg-orange-600 text-white',
        iconBg: 'bg-orange-100',
        pingBg: 'bg-orange-500',
        ringColor: 'ring-orange-200',
      };
    }
    return {
      cardBg: 'bg-amber-50/95 border-amber-300 text-amber-950',
      badgeBg: 'bg-amber-600 text-white',
      iconBg: 'bg-amber-100',
      pingBg: 'bg-amber-500',
      ringColor: 'ring-amber-200',
    };
  };

  const style = getStyle();

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex w-full max-w-sm sm:max-w-md items-start gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300 animate-slide-in-right ${style.cardBg}`}
    >
      {/* Icon with pulsing ping indicator */}
      <div className="relative flex shrink-0 items-center justify-center pt-0.5">
        <span className={`absolute inline-flex h-8 w-8 rounded-full opacity-40 animate-ping ${style.pingBg}`} />
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-xs ring-2 ${style.iconBg} ${style.ringColor}`}>
          {getIcon()}
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onNavigate && onNavigate(alert)}
        title="Click to view alerts"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.badgeBg}`}>
            {alert.severity || (isCritical ? 'CRITICAL' : 'CAUTION')}
          </span>
          <span className="text-[11px] font-semibold text-gray-500">
            {alert.timestamp || 'Just now'}
          </span>
        </div>

        <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug truncate">
          {alert.title || alert.event || 'Geofence Alert'}: <span className="text-gray-950">{alert.petName}</span>
        </h4>

        <p className="text-xs text-gray-700 mt-0.5 line-clamp-2 leading-relaxed">
          {alert.message || `${alert.petName} triggered an alert in ${alert.zone || 'Safe Zone'}.`}
        </p>

        <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-[#006C3B] hover:underline">
          <span>View in Alert History</span>
          <ExternalLink className="h-3 w-3" />
        </div>
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(alert.id);
        }}
        aria-label="Dismiss alert notification"
        className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-black/5 hover:text-gray-700 transition-colors cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Toast Container for In-App Alert Popups.
 * Stacks active alerts in the top-right corner.
 */
export default function AlertToastContainer({
  alerts = [],
  onDismiss,
  onNavigateToAlerts,
}) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0"
    >
      {alerts.map((alert) => (
        <AlertToastItem
          key={alert.id}
          alert={alert}
          onDismiss={onDismiss}
          onNavigate={() => onNavigateToAlerts && onNavigateToAlerts(alert)}
        />
      ))}
    </div>
  );
}
