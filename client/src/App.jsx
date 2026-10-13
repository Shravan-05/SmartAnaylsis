import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import api from './services/api';
import ResetConfirmationModal from './components/ResetConfirmationModal';
import SettingsModal from './components/SettingsModal';
import MobileBottomNav from './components/MobileBottomNav';

// Code-split heavy routes for rapid initial page load
const Overview = lazy(() => import('./pages/Overview'));
const Sessions = lazy(() => import('./pages/Sessions'));
const Heatmap = lazy(() => import('./pages/Heatmap'));
const Demo = lazy(() => import('./pages/Demo'));

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Loading page content">
      <div className="h-16 rounded-2xl bg-white/60 border border-slate-200/60" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-white/60 border border-slate-200/60" />
        ))}
      </div>
      <div className="h-80 rounded-2xl bg-white/60 border border-slate-200/60" />
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const [isConnected, setIsConnected] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);

  // Configured single website property: ApexCloud
  const selectedSite = 'cf_demo_site';

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Check backend & DB connectivity
  const checkHealth = useCallback(async () => {
    try {
      const data = await api.getHealth();
      setIsConnected(data.status === 'healthy');
    } catch {
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 25000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // Global manual refresh trigger
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await checkHealth();
    setRefreshKey((k) => k + 1);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Global seed data generator for ApexCloud
  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      const res = await api.seedDemoData(6, selectedSite);
      showToast(res.message || `Seeded 6 simulated sessions for ApexCloud!`);
      handleRefresh();
    } catch (err) {
      showToast('Failed to seed simulated data.');
    } finally {
      setIsSeeding(false);
    }
  };

  // Open reset confirmation dialog
  const handleOpenReset = () => {
    setIsResetOpen(true);
  };

  // Execute scoped reset operation for ApexCloud
  const handleConfirmReset = async () => {
    try {
      setIsResetting(true);
      const res = await api.clearDemoData(selectedSite);
      showToast(res.message || 'ApexCloud demo events cleared successfully.');
      setIsResetOpen(false);
      await handleRefresh();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to clear database events.');
    } finally {
      setIsResetting(false);
    }
  };

  // Determine header title from path
  const getPageInfo = () => {
    switch (location.pathname) {
      case '/':
        return {
          title: 'Overview',
          subtitle: 'High-level visitor metrics, trends, and recent interactions',
        };
      case '/sessions':
        return {
          title: 'Sessions & Journeys',
          subtitle: 'Searchable visitor sessions and chronological action timelines',
        };
      case '/heatmap':
        return {
          title: 'Click Heatmap',
          subtitle: 'Coordinate density mapping and interaction hotspot visualization',
        };
      case '/demo':
        return {
          title: 'Interactive Demo Website',
          subtitle: 'Clickable product page actively tracked by tracker.js into MongoDB',
        };
      default:
        return { title: 'Analytics Dashboard', subtitle: '' };
    }
  };

  const pageInfo = getPageInfo();

  // Standalone layout for Demo page to preserve realistic SaaS appearance
  if (location.pathname === '/demo') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
                <span className="text-xs font-mono text-teal-400">Loading ApexCloud Console...</span>
              </div>
            </div>
          }
        >
          <Demo />
        </Suspense>
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-3 text-xs font-semibold shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
            <span className="h-2 w-2 rounded-full bg-teal-400"></span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Accessible Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-teal-600 focus:text-white focus:font-semibold focus:rounded-xl focus:shadow-2xl focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>

      {/* Sidebar */}
      <Sidebar
        isConnected={isConnected}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onSeed={handleSeed}
        isSeeding={isSeeding}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Layout Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen w-full overflow-x-hidden">
        <Header
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onClear={handleOpenReset}
          isResetting={isResetting}
          onSeed={handleSeed}
          onOpenSettings={() => setIsSettingsOpen(true)}
          setMobileOpen={setMobileOpen}
        />

        {/* Scoped Reset Confirmation Modal */}
        <ResetConfirmationModal
          isOpen={isResetOpen}
          onClose={() => setIsResetOpen(false)}
          onConfirm={handleConfirmReset}
          isLoading={isResetting}
          siteId={selectedSite}
        />

        {/* Property Configuration Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          selectedSite={selectedSite}
        />

        {/* Global Toast Notification */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-20 lg:bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-sm text-white px-4 py-3 text-xs font-semibold shadow-2xl border border-slate-700/80 animate-scale-in"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400" />
            </span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Page Content with bottom clearance for mobile nav */}
        <main
          id="main-content"
          className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-10 max-w-[1400px] w-full mx-auto focus:outline-none"
          tabIndex={-1}
          key={`${refreshKey}-${selectedSite}`}
        >
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route
                path="/"
                element={<Overview onSeed={handleSeed} isSeeding={isSeeding} selectedSite={selectedSite} />}
              />
              <Route
                path="/sessions"
                element={<Sessions onSeed={handleSeed} isSeeding={isSeeding} selectedSite={selectedSite} />}
              />
              <Route
                path="/heatmap"
                element={<Heatmap onSeed={handleSeed} isSeeding={isSeeding} selectedSite={selectedSite} />}
              />
              <Route path="/demo" element={<Demo />} />
            </Routes>
          </Suspense>
        </main>

        {/* Accessible Mobile Bottom Navigation Bar */}
        <MobileBottomNav />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
