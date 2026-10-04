import {
  Home,
  MapPin,
  Settings,
  Bell,
  User,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({
  activeTab,
  setActiveTab,
  unresolvedAlertsCount = 1,
}) {
  const { currentUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Exact navigation items from Figma design (No "My Pets" tab)
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'zones', label: 'Safe Zones', icon: MapPin },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'alerts', label: 'Alerts', icon: Bell, hasAlertDot: unresolvedAlertsCount > 0 },
  ];

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* LEFT: GeoFence Logo */}
          <div className="flex items-center">
            <button
              onClick={() => handleNavClick('dashboard')}
              className="flex items-center gap-2.5 focus:outline-none group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#046A38] text-white shadow-sm transition-transform group-hover:scale-105">
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
              <span className="text-xl font-bold tracking-tight text-gray-900">
                GeoFence
              </span>
            </button>
          </div>

          {/* CENTER: Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`relative flex items-center gap-2 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-[#046A38] font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 stroke-[2] ${
                      isActive ? 'text-[#046A38]' : 'text-gray-600'
                    }`}
                  />
                  {item.hasAlertDot && (
                    <span className="h-2 w-2 rounded-full bg-[#E11D48] shrink-0" />
                  )}
                  <span>{item.label}</span>

                  {/* Active Indicator Underline */}
                  {isActive && (
                    <span className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-[#046A38] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* RIGHT: User Profile Avatar */}
          <div className="flex items-center gap-2">
            <button
              aria-label="User Profile"
              onClick={() => handleNavClick('settings')}
              title={currentUser ? (currentUser.displayName || currentUser.email) : 'User Settings'}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3E8FF] text-[#7E22CE] font-semibold text-xs transition-opacity hover:opacity-90 focus:outline-none cursor-pointer overflow-hidden border border-purple-200"
            >
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="User" className="w-full h-full object-cover" />
              ) : currentUser?.displayName ? (
                currentUser.displayName.charAt(0).toUpperCase()
              ) : currentUser?.email ? (
                currentUser.email.charAt(0).toUpperCase()
              ) : (
                <User className="h-5 w-5 stroke-[1.75]" />
              )}
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex md:hidden p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 shadow-md">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#EBF7EE] text-[#046A38] font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-[#046A38]' : 'text-gray-500'}`} />
                  <span>{item.label}</span>
                  {item.hasAlertDot && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-[#E11D48]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
