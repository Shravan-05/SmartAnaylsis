import React, { useState } from 'react';
import { Menu, RefreshCw, Copy, Check, Trash2, Settings, ChevronRight, Zap } from 'lucide-react';

export default function Header({
  title,
  subtitle,
  onRefresh,
  isRefreshing,
  onClear,
  isResetting,
  onOpenSettings,
  setMobileOpen,
}) {
  const [copied, setCopied] = useState(false);
  const currentSessionId = localStorage.getItem('cf_session_id') || 'No session';

  const copySessionId = () => {
    navigator.clipboard.writeText(currentSessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-20 flex h-[60px] w-full items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 sm:px-6 backdrop-blur-md shadow-sm">
      {/* ── Left: hamburger + breadcrumb ── */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setMobileOpen(true)}
          className="btn-ghost btn-sm lg:hidden shrink-0 p-2"
          aria-label="Open navigation menu"
        >
          <Menu className="h-4.5 w-4.5" aria-hidden="true" />
        </button>

        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="font-medium">ApexCloud</span>
            <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="font-bold text-slate-800 truncate">{title}</span>
          </nav>
          {subtitle && (
            <p className="text-[11px] text-slate-400 hidden md:block truncate leading-tight mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* ── Right: actions ── */}
      <div className="flex items-center gap-2 shrink-0">

        {/* Live property badge */}
        <div
          role="status"
          aria-label="Tracked property: ApexCloud Demo"
          className="hidden sm:flex items-center gap-1.5 rounded-xl border border-teal-200/70 bg-teal-50 px-2.5 py-1.5 shadow-sm"
        >
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
          </span>
          <span className="text-[11px] font-bold text-teal-800">ApexCloud Demo</span>
          <span className="hidden lg:inline font-mono text-[9px] text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded-md border border-teal-200/50">
            cf_demo_site
          </span>
        </div>

        {/* Session ID copy */}
        <button
          type="button"
          onClick={copySessionId}
          title="Click to copy your browser session ID"
          className="group hidden xl:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs text-slate-600 hover:border-teal-300 hover:bg-teal-50 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          aria-label={`Copy session ID ${currentSessionId}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-teal-500" aria-hidden="true" />
          <span className="font-mono font-semibold truncate max-w-[90px] text-slate-700">
            {currentSessionId.replace('session_', 'sess_')}
          </span>
          {copied
            ? <Check className="h-3 w-3 text-teal-600" aria-hidden="true" />
            : <Copy className="h-3 w-3 text-slate-400 group-hover:text-teal-600 transition-colors" aria-hidden="true" />
          }
        </button>

        {/* Settings */}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            title="Property settings"
            className="btn-secondary btn-sm hidden md:flex"
            aria-label="Open settings"
          >
            <Settings className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <span>Settings</span>
          </button>
        )}

        {/* Reset data */}
        <button
          type="button"
          onClick={onClear}
          disabled={isResetting}
          title="Reset analytics data (opens confirmation)"
          className="btn-danger btn-sm"
          aria-label="Reset analytics data"
        >
          {isResetting
            ? <span className="h-3.5 w-3.5 rounded-full border-2 border-rose-600 border-t-transparent animate-spin" aria-hidden="true" />
            : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          }
          <span className="hidden sm:inline">{isResetting ? 'Resetting…' : 'Reset'}</span>
        </button>

        {/* Refresh */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh analytics data"
          className="btn-secondary btn-sm"
          aria-label="Refresh analytics data"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
}
