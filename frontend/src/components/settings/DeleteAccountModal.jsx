import { useState } from 'react';
import { X, AlertTriangle, Loader2, Lock, ShieldAlert } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';
import { useAuth } from '../../context/AuthContext';
import { deleteFullUserAccount } from '../../services/firestore/account';

export default function DeleteAccountModal({ isOpen, onClose }) {
  const { currentUser } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [password, setPassword] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [requiresGoogleReauth, setRequiresGoogleReauth] = useState(false);

  const isGoogleUser = currentUser?.providerData?.some((p) => p.providerId === 'google.com');

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage('');

    try {
      const result = await deleteFullUserAccount(password ? password.trim() : null);

      if (result.success) {
        // Auth listener in AuthContext will automatically trigger and redirect to AuthScreen
        onClose();
        return;
      }

      if (result.requiresReauth) {
        if (result.isGoogleUser) {
          setRequiresGoogleReauth(true);
        } else {
          setRequiresPassword(true);
        }
      }

      setErrorMessage(result.error || 'Failed to delete account.');
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred during account deletion.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return;
    setPassword('');
    setErrorMessage('');
    setRequiresPassword(false);
    setRequiresGoogleReauth(false);
    onClose();
  };

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={handleClose}
      closeOnBackdrop={!isDeleting}
      closeOnEsc={!isDeleting}
      maxWidthClass="max-w-md"
    >
      <div className="w-full rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-red-100 overflow-y-auto max-h-[calc(100vh-3rem)]">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-2xs">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Delete GeoFence Account?
              </h3>
              <p className="text-xs text-red-600 font-medium">Permanent &amp; Irreversible</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            aria-label="Close"
            className="rounded-xl border border-gray-200 p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="py-4 space-y-3.5">
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Are you sure you want to permanently delete your account (
            <span className="font-semibold text-gray-900">{currentUser?.email}</span>)?
          </p>

          <div className="rounded-2xl bg-red-50/80 p-3.5 border border-red-200/70 text-xs text-red-800 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-red-900">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
              <span>The following data will be permanently wiped:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-red-700 pl-1">
              <li>All registered pets and telemetry history</li>
              <li>All custom safe zones and boundaries</li>
              <li>All notifications and alert records</li>
              <li>Your personal tracking and safety settings</li>
            </ul>
          </div>

          {/* Re-authentication Password Input (for Email/Password accounts if required) */}
          {(requiresPassword || (!isGoogleUser && requiresPassword)) && (
            <div className="pt-2 space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700">
                Enter your password to verify ownership:
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your current password"
                  disabled={isDeleting}
                  className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2 text-xs sm:text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>
          )}

          {/* Re-authenticate with Google button */}
          {requiresGoogleReauth && (
            <div className="pt-2 text-center">
              <p className="text-xs text-gray-600 mb-2">
                Google requires fresh authentication before account removal:
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="rounded-xl bg-red-100/90 p-3 border border-red-200 text-xs text-red-800 font-medium animate-fade-in">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || (requiresPassword && !password.trim())}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#DC2626] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#B91C1C] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Deleting account...</span>
              </>
            ) : requiresGoogleReauth ? (
              <span>Re-authenticate &amp; Delete</span>
            ) : (
              <span>Delete My Account</span>
            )}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
