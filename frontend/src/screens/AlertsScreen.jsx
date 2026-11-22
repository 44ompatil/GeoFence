import { useState } from 'react';
import { CheckCircle2, Check, AlertTriangle, ShieldCheck, Trash2, Loader2 } from 'lucide-react';
import ModalPortal from '../components/common/ModalPortal';
import { getAlertTimestampMs } from '../services/firestore/alerts';

export default function AlertsScreen({ alerts = [], onResolveAlert, onClearAll }) {
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'resolved'
  const [resolvingId, setResolvingId] = useState(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'active') return !alert.resolved;
    if (filter === 'resolved') return alert.resolved;
    return true;
  });

  // Strict sorting: newest alerts always appear at the top
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    return getAlertTimestampMs(b) - getAlertTimestampMs(a);
  });

  const getSeverityBadge = (severity, resolved) => {
    if (resolved) {
      return (
        <span className="inline-flex items-center justify-center rounded-md bg-[#D1FAE5] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#059669]">
          RESOLVED
        </span>
      );
    }

    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
      case 'ESCAPED':
      case 'BOUNDARY_BREACH':
        return (
          <span className="inline-flex items-center justify-center rounded-md bg-[#FDE8E8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#DC2626]">
            CRITICAL
          </span>
        );
      case 'HIGH RISK':
      case 'HIGH':
      case 'HIGH_RISK_MOVEMENT':
      case 'DEVICE_OFFLINE':
        return (
          <span className="inline-flex items-center justify-center rounded-md bg-[#FFEDD5] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#EA580C]">
            HIGH RISK
          </span>
        );
      case 'CAUTION':
      case 'WARNING':
      case 'APPROACHING_BOUNDARY':
      case 'LOW_BATTERY':
        return (
          <span className="inline-flex items-center justify-center rounded-md bg-[#FEF3C7] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#D97706]">
            CAUTION
          </span>
        );
      case 'RESOLVED':
      case 'SAFE':
      default:
        return (
          <span className="inline-flex items-center justify-center rounded-md bg-[#D1FAE5] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#059669]">
            RESOLVED
          </span>
        );
    }
  };

  const handleResolve = async (alertId) => {
    if (!onResolveAlert || resolvingId) return;
    setResolvingId(alertId);
    try {
      await onResolveAlert(alertId);
    } finally {
      setResolvingId(null);
    }
  };

  const handleConfirmClearAll = async () => {
    if (!onClearAll || isClearing) return;
    setIsClearing(true);
    try {
      await onClearAll();
      setConfirmClearOpen(false);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
            Alert History
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Real-time alerts and severity tracking for all linked pets.
          </p>
        </div>

        {/* Action Controls: Filter Buttons + Clear All */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-[#005A36] text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            All Alerts ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              filter === 'active'
                ? 'bg-[#005A36] text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Active ({alerts.filter((a) => !a.resolved).length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              filter === 'resolved'
                ? 'bg-[#005A36] text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Resolved ({alerts.filter((a) => a.resolved).length})
          </button>

          {/* Clear All Button */}
          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            disabled={alerts.length === 0}
            title={alerts.length === 0 ? 'No alerts to clear' : 'Clear all alerts from history'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/80 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ml-auto sm:ml-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Alerts Table Card */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 bg-[#FAFBF9]/60">
                <th className="py-3.5 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  SEVERITY
                </th>
                <th className="py-3.5 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  PET
                </th>
                <th className="py-3.5 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  EVENT
                </th>
                <th className="py-3.5 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  ZONE
                </th>
                <th className="py-3.5 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  TIMESTAMP
                </th>
                <th className="py-3.5 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">
                  STATUS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedAlerts.length > 0 ? (
                sortedAlerts.map((alert) => {
                  const isResolved = Boolean(alert.resolved);
                  return (
                    <tr
                      key={alert.id}
                      className="hover:bg-[#FAFBF9] transition-colors"
                    >
                      {/* Severity */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        {getSeverityBadge(alert.severity, isResolved)}
                      </td>

                      {/* Pet */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-full text-white font-bold text-xs shadow-xs"
                            style={{ backgroundColor: alert.petColor || '#B8865B' }}
                          >
                            {alert.petInitial || alert.petName?.charAt(0) || 'P'}
                          </div>
                          <span className="font-bold text-gray-900 text-sm">
                            {alert.petName}
                          </span>
                        </div>
                      </td>

                      {/* Event */}
                      <td className="py-4 px-6 text-sm text-gray-800 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{alert.event || alert.title}</div>
                        {alert.message && alert.message !== alert.event && (
                          <div className="text-xs text-gray-500">{alert.message}</div>
                        )}
                      </td>

                      {/* Zone */}
                      <td className="py-4 px-6 text-sm text-gray-600 whitespace-nowrap">
                        {alert.zone || 'Designated Zone'}
                      </td>

                      {/* Timestamp */}
                      <td className="py-4 px-6 text-sm text-gray-600 whitespace-nowrap">
                        {alert.timestamp}
                      </td>

                      {/* Status / Action */}
                      <td className="py-4 px-6 text-sm text-right whitespace-nowrap">
                        {isResolved ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                            <Check className="h-3.5 w-3.5" />
                            <span>Resolved</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleResolve(alert.id)}
                            disabled={resolvingId === alert.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#005A36] bg-white px-2.5 py-1 text-xs font-semibold text-[#005A36] hover:bg-[#005A36] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>{resolvingId === alert.id ? 'Resolving...' : 'Resolve'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="py-14 text-center text-gray-500">
                    <ShieldCheck className="mx-auto h-10 w-10 text-emerald-600 mb-2.5 opacity-90" />
                    <p className="text-sm font-semibold text-gray-800">
                      {filter === 'all' ? 'No alerts yet' : `No ${filter} alerts found`}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      All your tracked pets are currently safe. Real-time notifications will appear here when safe-zone events occur.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clear All Confirmation Modal */}
      <ModalPortal
        isOpen={confirmClearOpen}
        onClose={() => !isClearing && setConfirmClearOpen(false)}
        maxWidthClass="max-w-md"
      >
        <div className="w-full rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 shadow-xs">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-snug">
                Clear All Alerts?
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                This will permanently remove all {alerts.length} alert(s) from your account history.
              </p>
            </div>
          </div>

          <div className="my-4 rounded-xl bg-gray-50 p-3.5 text-xs text-gray-600 border border-gray-200/80 leading-relaxed">
            This action only removes past alert records. Your registered pets, configured safe zones, and live tracking settings will remain intact.
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setConfirmClearOpen(false)}
              disabled={isClearing}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmClearAll}
              disabled={isClearing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isClearing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Clearing...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Yes, Clear All</span>
                </>
              )}
            </button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}

