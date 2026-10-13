import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings, X, Copy, Check, ShieldCheck, Code, Globe, Database } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, selectedSite = 'cf_demo_site' }) {
  const [copiedScript, setCopiedScript] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const isProd = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const hostDomain = typeof window !== 'undefined' ? window.location.origin : (isProd ? 'https://smart-anaylsis.vercel.app' : 'http://localhost:5173');
  const apiEndpoint = isProd ? 'https://smartanaylsis.onrender.com/api' : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

  const scriptTag = `<script defer src="${hostDomain}/tracker.js" data-site-id="${selectedSite}" data-api-url="${apiEndpoint}"></script>`;

  const copyScript = () => {
    navigator.clipboard.writeText(scriptTag);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const configRows = [
    { label: 'Property ID',        value: selectedSite,                       mono: true,  color: 'teal' },
    { label: 'Property Name',      value: 'ApexCloud Demo',                   mono: false, color: null   },
    { label: 'Host Domain',        value: hostDomain,                         mono: true,  color: null   },
    { label: 'API Endpoint',       value: `${apiEndpoint}/events`,            mono: true,  color: null   },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        className="animate-scale-in w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-modal)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
              <Settings className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h3 id="settings-modal-title" className="text-base font-bold text-slate-900">Property Configuration</h3>
              <p className="text-xs text-slate-400">ApexCloud · Single-Site Analytics</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg text-slate-400" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Config table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50/80 px-3.5 py-2.5 border-b border-slate-200">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Globe className="h-3 w-3" /> Property Details
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {configRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                  <span className="text-slate-500 font-medium">{row.label}</span>
                  <span className={`font-semibold ${row.mono ? 'font-mono' : ''} ${row.color === 'teal' ? 'text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-lg' : 'text-slate-800'}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Embed script */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Code className="h-3.5 w-3.5 text-teal-600" />
                Client Tracking Embed
              </p>
              <button onClick={copyScript} className="btn-ghost btn-sm text-teal-600 hover:text-teal-700 hover:bg-teal-50">
                {copiedScript ? <Check className="h-3.5 w-3.5 text-teal-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedScript ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-[11px] font-mono text-teal-300 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
              {scriptTag}
            </pre>
          </div>

          {/* Privacy notice */}
          <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-3.5 flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-teal-900 leading-relaxed">
              <strong className="font-semibold">Self-Tracking Guard Active: </strong>
              Dashboard pages (<code className="font-mono bg-teal-100 px-1 rounded">/</code>, <code className="font-mono bg-teal-100 px-1 rounded">/sessions</code>, <code className="font-mono bg-teal-100 px-1 rounded">/heatmap</code>) are automatically excluded by the tracker to prevent recursive analytics.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <button onClick={onClose} className="btn-primary btn-sm">Close Settings</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
