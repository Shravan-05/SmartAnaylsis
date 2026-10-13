import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X, ShieldCheck } from 'lucide-react';

export default function ResetConfirmationModal({ isOpen, onClose, onConfirm, isLoading, siteId = 'cf_demo_site' }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape' && !isLoading) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
      onClick={() => !isLoading && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-modal-title"
    >
      <div
        className="animate-scale-in w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-modal)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <h3 id="reset-modal-title" className="text-base font-bold text-slate-900">Reset Analytics Data</h3>
              <p className="text-xs text-slate-400 mt-0.5">Scope: <code className="font-mono text-slate-600">{siteId}</code></p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="btn-ghost p-1.5 rounded-lg text-slate-400 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>Are you sure you want to reset all analytics for <strong className="text-slate-900">ApexCloud Demo</strong>? This action cannot be undone.</p>

          <div className="rounded-xl border border-rose-100 bg-rose-50 p-3.5 space-y-1.5">
            <p className="font-semibold text-rose-900 flex items-center gap-1.5">
              <Trash2 className="h-3.5 w-3.5 text-rose-600" /> Will be deleted:
            </p>
            <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-rose-800">
              <li>All <code className="font-mono bg-rose-100 px-1 rounded">page_view</code> and <code className="font-mono bg-rose-100 px-1 rounded">click</code> events</li>
              <li>Aggregated sessions and interaction timelines</li>
              <li>Heatmap coordinate data and hotspots</li>
            </ul>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3.5 space-y-1.5">
            <p className="font-semibold text-emerald-900 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Will be preserved:
            </p>
            <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-emerald-800">
              <li>Site registration and domain configuration</li>
              <li>Tracking script (<code className="font-mono bg-emerald-100 px-1 rounded">tracker.js</code>) settings</li>
              <li>Events for any other tracked properties</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <button type="button" onClick={onClose} disabled={isLoading} className="btn-secondary btn-sm disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={isLoading} className="btn btn-sm bg-rose-600 text-white hover:bg-rose-700 shadow-sm disabled:opacity-50 focus-visible:ring-rose-500">
            {isLoading
              ? <><span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />Resetting…</>
              : <><Trash2 className="h-3.5 w-3.5" />Confirm Reset</>
            }
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
