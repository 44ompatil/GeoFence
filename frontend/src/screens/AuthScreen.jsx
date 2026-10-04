import { useState } from 'react';
import { Mail, Eye, EyeOff, ShieldAlert, MapPin, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import authDogImage from '../assets/auth-dog.jpg';

export default function AuthScreen({ initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'forgot'
  const { login, register, loginWithGoogle, resetPassword } = useAuth();

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const clearMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSwitchMode = (newMode) => {
    clearMessages();
    setMode(newMode);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim() || !password) {
      setErrorMessage('Please provide an email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please check and try again.');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('Please agree to the Terms & Privacy Policy to continue.');
      return;
    }

    setIsSubmitting(true);
    const result = await register(email, password, fullName);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error);
    }
  };

  const handleGoogleSignIn = async () => {
    clearMessages();
    setIsGoogleSubmitting(true);
    const result = await loginWithGoogle();
    setIsGoogleSubmitting(false);

    if (!result.success && result.rawError?.code !== 'auth/popup-closed-by-user') {
      setErrorMessage(result.error);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);
    const result = await resetPassword(email);
    setIsSubmitting(false);

    if (result.success) {
      setSuccessMessage('Password reset link sent! Please check your email inbox.');
    } else {
      setErrorMessage(result.error);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F6F5F0] font-sans">
      {/* ================= LEFT HERO PANEL ================= */}
      <div className="w-full lg:w-1/2 bg-[#0C5A37] p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden shrink-0">
        {/* Top: GeoFence Brand Logo */}
        <div className="flex items-center gap-2.5 z-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-sm">
            {/* Paw Icon */}
            <svg
              className="h-5 w-5 fill-white"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="8" cy="8.5" r="1.75" />
              <circle cx="16" cy="8.5" r="1.75" />
              <circle cx="5" cy="13" r="1.5" />
              <circle cx="19" cy="13" r="1.5" />
              <path d="M12 11.5c-2.4 0-4.2 1.8-4.2 3.8 0 1.6 1.1 2.9 2.5 3.5.5.2 1.1.2 1.7.2s1.2 0 1.7-.2c1.4-.6 2.5-1.9 2.5-3.5 0-2-1.8-3.8-4.2-3.8z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            GeoFence
          </span>
        </div>

        {/* Center: Interactive Visual Illustration & Value Prop */}
        <div className="my-auto py-10 z-10 flex flex-col items-center lg:items-start max-w-lg mx-auto lg:mx-0 w-full">
          {/* Visual Orbit Card */}
          <div className="w-full max-w-[420px] aspect-[16/11] rounded-[24px] bg-[#094E2E]/80 border border-white/20 p-6 flex items-center justify-center relative shadow-2xl backdrop-blur-sm">
            {/* Dashed Orbit Trajectory */}
            <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-full border-2 border-dashed border-white/40 absolute flex items-center justify-center pointer-events-none" />

            {/* Central Dog Avatar */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-[#24B29E] shadow-xl relative z-10 bg-[#24B29E] flex items-center justify-center">
              <img
                src={authDogImage}
                alt="GeoFence explorer pet"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Floating Orbit Node 1: Location Pin (Left) */}
            <div className="absolute left-6 sm:left-8 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white shadow-lg flex items-center justify-center z-20 transition-transform hover:scale-110">
              <MapPin className="w-5 h-5 text-[#0C5A37]" />
            </div>

            {/* Floating Orbit Node 2: Shield Alert (Top Right) */}
            <div className="absolute top-8 sm:top-10 right-8 sm:right-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white shadow-lg flex items-center justify-center z-20 transition-transform hover:scale-110">
              <ShieldAlert className="w-5 h-5 text-[#0C5A37]" />
            </div>

            {/* Floating Orbit Node 3: Paw Print (Bottom Right) */}
            <div className="absolute bottom-8 sm:bottom-10 right-10 sm:right-12 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white shadow-lg flex items-center justify-center z-20 transition-transform hover:scale-110">
              <svg
                className="w-5 h-5 fill-[#0C5A37]"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="8" cy="8.5" r="1.75" />
                <circle cx="16" cy="8.5" r="1.75" />
                <circle cx="5" cy="13" r="1.5" />
                <circle cx="19" cy="13" r="1.5" />
                <path d="M12 11.5c-2.4 0-4.2 1.8-4.2 3.8 0 1.6 1.1 2.9 2.5 3.5.5.2 1.1.2 1.7.2s1.2 0 1.7-.2c1.4-.6 2.5-1.9 2.5-3.5 0-2-1.8-3.8-4.2-3.8z" />
              </svg>
            </div>
          </div>

          {/* Copy Typography */}
          <div className="mt-8 text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
              Safety that stays close.
            </h1>
            <p className="mt-2 text-sm sm:text-base text-white/80 font-normal leading-relaxed max-w-md">
              A calmer way to keep an eye on the explorers you love.
            </p>
          </div>
        </div>

        {/* Bottom Feature Highlights */}
        <div className="text-xs text-white/70 tracking-wide text-center lg:text-left z-10 pt-4">
          Live location &middot; Safe zones &middot; Gentle alerts
        </div>

        {/* Ambient background decoration glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#16784C] rounded-full blur-3xl opacity-30 pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#063C23] rounded-full blur-3xl opacity-40 pointer-events-none" />
      </div>

      {/* ================= RIGHT FORM PANEL ================= */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-[440px] bg-white rounded-[28px] p-6 sm:p-9 shadow-[0_10px_35px_rgba(0,0,0,0.05)] border border-gray-100 transition-all">
          
          {/* ================= 1. LOGIN MODE ================= */}
          {mode === 'login' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl sm:text-[26px] font-bold text-gray-900 tracking-tight">
                  Welcome back
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Sign in to keep every adventure safely within reach.
                </p>
              </div>

              {/* Error / Success Notifications */}
              {errorMessage && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="om.patil@example.com"
                      className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3.5 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#00875A] focus:outline-none focus:ring-1 focus:ring-[#00875A] transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-3.5 pr-10 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#00875A] focus:outline-none focus:ring-1 focus:ring-[#00875A] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Forgot Password Link */}
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('forgot')}
                    className="text-xs font-medium text-[#00875A] hover:underline focus:outline-none cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  id="login-submit-btn"
                  type="submit"
                  disabled={isSubmitting || isGoogleSubmitting}
                  className="w-full rounded-full bg-[#00875A] py-3 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#00734D] active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Log In</span>
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-5 flex items-center justify-center">
                <div className="w-full border-t border-gray-200" />
                <span className="bg-white px-3 text-xs text-gray-400">or</span>
              </div>

              {/* Continue with Google */}
              <button
                id="login-google-btn"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting || isGoogleSubmitting}
                className="w-full rounded-full border border-[#00875A] bg-white py-2.5 text-xs sm:text-sm font-semibold text-[#00875A] hover:bg-emerald-50/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isGoogleSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#00875A]" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              {/* Bottom Switch Link */}
              <p className="mt-6 text-center text-xs text-gray-600">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleSwitchMode('register')}
                  className="font-semibold text-[#00875A] hover:underline cursor-pointer"
                >
                  Create account
                </button>
              </p>
            </div>
          )}

          {/* ================= 2. REGISTER MODE ================= */}
          {mode === 'register' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl sm:text-[26px] font-bold text-gray-900 tracking-tight leading-tight">
                  Create your GeoFence account
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Set up your pet-safety home in just a few moments.
                </p>
              </div>

              {/* Error / Success Notifications */}
              {errorMessage && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                {/* Full Name Field */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Full name
                  </label>
                  <input
                    id="register-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Om Patil"
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3.5 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#00875A] focus:outline-none focus:ring-1 focus:ring-[#00875A] transition-all"
                  />
                </div>

                {/* Email Field */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="register-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="om.patil@example.com"
                      className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3.5 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#00875A] focus:outline-none focus:ring-1 focus:ring-[#00875A] transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-3.5 pr-10 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#00875A] focus:outline-none focus:ring-1 focus:ring-[#00875A] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="register-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-3.5 pr-10 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#00875A] focus:outline-none focus:ring-1 focus:ring-[#00875A] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Terms and Privacy Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="register-terms"
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#00875A] focus:ring-[#00875A] cursor-pointer"
                  />
                  <label
                    htmlFor="register-terms"
                    className="text-xs text-gray-600 select-none cursor-pointer"
                  >
                    I agree to the Terms & Privacy Policy
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  id="register-submit-btn"
                  type="submit"
                  disabled={isSubmitting || isGoogleSubmitting}
                  className="w-full rounded-full bg-[#00875A] py-3 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#00734D] active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer mt-3"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Continue</span>
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="w-full border-t border-gray-200" />
                <span className="bg-white px-3 text-xs text-gray-400">or</span>
              </div>

              {/* Continue with Google */}
              <button
                id="register-google-btn"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting || isGoogleSubmitting}
                className="w-full rounded-full border border-[#00875A] bg-white py-2.5 text-xs sm:text-sm font-semibold text-[#00875A] hover:bg-emerald-50/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isGoogleSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#00875A]" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              {/* Bottom Switch Link */}
              <p className="mt-5 text-center text-xs text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleSwitchMode('login')}
                  className="font-semibold text-[#00875A] hover:underline cursor-pointer"
                >
                  Log in
                </button>
              </p>
            </div>
          )}

          {/* ================= 3. FORGOT PASSWORD MODE ================= */}
          {mode === 'forgot' && (
            <div>
              <button
                type="button"
                onClick={() => handleSwitchMode('login')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-4 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Log In</span>
              </button>

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                  Reset password
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Enter your email and we will send a password reset link to your inbox.
                </p>
              </div>

              {/* Feedback */}
              {errorMessage && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="om.patil@example.com"
                      className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3.5 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#00875A] focus:outline-none focus:ring-1 focus:ring-[#00875A] transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-full bg-[#00875A] py-3 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#00734D] active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Send Reset Link</span>
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
