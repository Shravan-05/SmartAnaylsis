import React, { useState, useEffect } from 'react';
import { X, Globe, Plus, Copy, Check, Code2, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function AddSiteModal({ isOpen, onClose, onSiteAdded }) {
  const [siteId, setSiteId] = useState('');
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdSite, setCreatedSite] = useState(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.createSite({
        site_id: siteId.trim().toLowerCase(),
        name: name.trim(),
        domain: domain.trim(),
      });
      setCreatedSite(res.data);
      onSiteAdded(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to register website');
    } finally {
      setLoading(false);
    }
  };

  const trackingSnippet = createdSite
    ? `<script defer src="${window.location.origin}/tracker.js" data-site-id="${createdSite.site_id}" data-api-url="http://localhost:5000/api"></script>`
    : '';

  const copySnippet = () => {
    navigator.clipboard.writeText(trackingSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleClose = () => {
    setSiteId('');
    setName('');
    setDomain('');
    setCreatedSite(null);
    setError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-modal-title"
    >
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />

      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {createdSite ? 'Website Registered!' : 'Register New Website'}
              </h3>
              <p className="text-xs text-slate-500">Multi-website tracking configuration</p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/80">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          {createdSite ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-teal-50 border border-teal-200 p-4 text-xs text-teal-800">
                <p className="font-bold">Website "{createdSite.name}" registered successfully!</p>
                <p className="mt-1 text-[11px] text-teal-700">
                  Embed the tracking snippet below into the <code className="font-mono bg-teal-100 px-1 py-0.5 rounded">&lt;head&gt;</code> of your website to begin capturing analytics for this property.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center justify-between">
                  <span>Tracking Snippet</span>
                  <button
                    onClick={copySnippet}
                    className="text-teal-600 hover:text-teal-700 flex items-center gap-1 font-normal"
                  >
                    {copiedSnippet ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedSnippet ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </label>
                <div className="rounded-lg bg-slate-900 p-3 text-xs font-mono text-teal-300 break-all select-all">
                  {trackingSnippet}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleClose}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Site ID <span className="text-slate-400 font-normal">(unique identifier slug)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. portfolio_app, store_prod"
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono text-slate-900 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Website Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Portfolio Website"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Domain or URL</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. https://myportfolio.com or localhost:3000"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {loading ? 'Registering...' : 'Register Website'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
