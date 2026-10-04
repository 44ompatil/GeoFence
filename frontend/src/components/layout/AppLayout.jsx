import Navbar from './Navbar';

export default function AppLayout({
  children,
  activeTab,
  setActiveTab,
  unresolvedAlertsCount,
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F0F2ED] text-gray-900">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unresolvedAlertsCount={unresolvedAlertsCount}
      />
      <main className="flex-1 pb-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
