import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Flame,
  Compass,
  Activity,
  Settings,
  X,
  Zap,
  RefreshCw,
  Loader2,
} from 'lucide-react';

const navItems = [
  { name: 'Overview',   to: '/',        icon: LayoutDashboard, end: true  },
  { name: 'Sessions',   to: '/sessions', icon: Users,           end: false },
  { name: 'Heatmap',    to: '/heatmap',  icon: Flame,           end: false },
  { name: 'Demo Site',  to: '/demo',     icon: Compass,         end: false, badge: 'ApexCloud' },
];

function SidebarContent({ backendStatus, onRetryConnection, setMobileOpen, onSeed, isSeeding, onOpenSettings, isMobile }) {
  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-300 border-r border-slate-800/60">

      {/* ── Brand header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/70">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg shadow-teal-500/25">
            <Activity className="h-4.5 w-4.5 text-white" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-bold tracking-tight text-white">Smart Analysis</p>
            <p className="text-[10px] text-slate-500 font-medium">Analytics Platform</p>
          </div>
        </div>

        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="section-heading px-2 mb-3">Navigation</p>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `group flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
                  isActive
                    ? 'bg-teal-500/10 text-teal-300 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                      isActive ? 'bg-teal-500/20 text-teal-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`}>
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                    <span>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.badge && (
                      <span className="rounded-full bg-teal-500/15 border border-teal-500/25 px-1.5 py-0.5 text-[9px] font-bold text-teal-400 tracking-wide">
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <div className="h-1.5 w-1.5 rounded-full bg-teal-400 shadow-sm shadow-teal-400/50" />
                    )}
                  </div>
                </>
              )}
            </NavLink>
          );
        })}

        {/* Settings */}
        {onOpenSettings && (
          <button
            onClick={() => { setMobileOpen(false); onOpenSettings(); }}
            className="group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-400 hover:bg-slate-800/70 hover:text-slate-100 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 group-hover:text-slate-300 transition-colors">
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
            <span>Settings</span>
          </button>
        )}
      </nav>

      {/* ── Footer ── */}
      <div className="border-t border-slate-800/70 p-3 space-y-2.5">
        {/* Generate demo data */}
        <button
          onClick={onSeed}
          disabled={isSeeding}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 px-3 py-2.5 text-xs font-semibold text-slate-200 transition-all duration-150 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 group"
          title="Generate 6 simulated visitor sessions with real click coordinates"
        >
          <Zap className={`h-3.5 w-3.5 text-teal-400 transition-transform ${isSeeding ? 'animate-spin' : 'group-hover:scale-110'}`} aria-hidden="true" />
          <span>{isSeeding ? 'Generating…' : 'Generate Demo Data'}</span>
        </button>

        {/* Backend status pill */}
        <div
          role="status"
          aria-live="polite"
          aria-label={`Backend connection: ${backendStatus}`}
          className="space-y-1.5"
        >
          <div className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800/80 px-3 py-2">
            <div className="flex items-center gap-2">
              {backendStatus === 'connecting' && (
                <Loader2 className="h-2.5 w-2.5 text-amber-400 animate-spin flex-shrink-0" />
              )}
              {backendStatus === 'online' && (
                <div className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </div>
              )}
              {backendStatus === 'offline' && (
                <div className="h-2 w-2 rounded-full bg-rose-500 flex-shrink-0" />
              )}
              <span className={`text-[11px] font-semibold ${
                backendStatus === 'online'     ? 'text-emerald-400' :
                backendStatus === 'connecting' ? 'text-amber-400'   :
                                                 'text-rose-400'
              }`}>
                {backendStatus === 'online'     ? 'Online'      :
                 backendStatus === 'connecting' ? 'Connecting…' :
                                                  'Offline'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-600">API · DB</span>
          </div>

          {/* Retry button — only shown when offline */}
          {backendStatus === 'offline' && onRetryConnection && (
            <button
              onClick={onRetryConnection}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-rose-900/30 hover:bg-rose-800/40 border border-rose-800/50 px-3 py-2 text-[11px] font-semibold text-rose-300 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <RefreshCw className="h-3 w-3" />
              Retry Connection
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ backendStatus, onRetryConnection, mobileOpen, setMobileOpen, onSeed, isSeeding, onOpenSettings }) {
  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30">
        <SidebarContent
          backendStatus={backendStatus}
          onRetryConnection={onRetryConnection}
          setMobileOpen={setMobileOpen}
          onSeed={onSeed}
          isSeeding={isSeeding}
          onOpenSettings={onOpenSettings}
          isMobile={false}
        />
      </aside>

      {/* Mobile: drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />

          {/* Drawer panel */}
          <div
            className="animate-slide-in-left absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent
              backendStatus={backendStatus}
              onRetryConnection={onRetryConnection}
              setMobileOpen={setMobileOpen}
              onSeed={onSeed}
              isSeeding={isSeeding}
              onOpenSettings={onOpenSettings}
              isMobile={true}
            />
          </div>
        </div>
      )}
    </>
  );
}
