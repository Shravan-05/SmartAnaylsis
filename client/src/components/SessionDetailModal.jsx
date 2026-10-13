import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Eye,
  MousePointerClick,
  Calendar,
  Clock,
  ExternalLink,
  MapPin,
  Layers,
  Loader2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import api from '../services/api';

export default function SessionDetailModal({
  sessionId,
  onClose,
  siteId = 'cf_demo_site',
  timeRange = 'all',
  startDate = null,
  endDate = null,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    let isMounted = true;
    async function fetchSessionEvents() {
      setLoading(true);
      setError(null);
      try {
        const response = await api.getSessionEvents(sessionId, siteId, timeRange, startDate, endDate);
        if (isMounted) {
          setSessionData(response);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load session events');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchSessionEvents();
    return () => {
      isMounted = false;
    };
  }, [sessionId, siteId, timeRange, startDate, endDate]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Lock background body scroll while modal is mounted
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const copyId = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!sessionId) return null;
  if (typeof document === 'undefined') return null;

  const events = sessionData?.data || [];
  const pageViewCount = events.filter((e) => e.event_type === 'page_view').length;
  const clickCount = events.filter((e) => e.event_type === 'click').length;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity z-0"
        style={{ position: 'fixed', inset: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Container */}
      <div
        className="relative z-10 w-full max-w-3xl flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
        style={{ maxHeight: '90dvh' }}
      >
        {/* Sticky Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 backdrop-blur-sm px-4 sm:px-6 py-3.5 sm:py-4 shrink-0 gap-3 z-10">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 border border-teal-200 shrink-0">
                User Journey
              </span>
              <button
                onClick={copyId}
                className="flex items-center gap-1.5 font-mono text-xs sm:text-sm font-bold text-slate-800 hover:text-teal-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded p-1 min-w-0 max-w-full"
                title="Click to copy full Session ID"
                aria-label="Copy session ID to clipboard"
              >
                <span id="session-modal-title" className="truncate max-w-[160px] sm:max-w-xs md:max-w-md">
                  {sessionId}
                </span>
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-teal-600 shrink-0" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 shrink-0" aria-hidden="true" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 truncate sm:whitespace-normal">
              Chronological sequence of visitor interactions recorded in this session.
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close session details dialog"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 shrink-0"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-3 border-b border-slate-100 bg-white px-4 sm:px-6 py-2.5 sm:py-3 text-center text-xs shrink-0">
          <div className="border-r border-slate-100">
            <span className="text-slate-500">Total Events: </span>
            <span className="font-bold text-slate-900">{events.length}</span>
          </div>
          <div className="border-r border-slate-100">
            <span className="text-purple-600">Page Views: </span>
            <span className="font-bold text-slate-900">{pageViewCount}</span>
          </div>
          <div>
            <span className="text-teal-600">Clicks: </span>
            <span className="font-bold text-slate-900">{clickCount}</span>
          </div>
        </div>

        {/* Vertically Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 overscroll-contain">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              <p className="text-sm font-medium">Loading session timeline...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-10 w-10 text-rose-500 mb-2" />
              <h3 className="text-sm font-semibold text-slate-900">Unable to load session</h3>
              <p className="text-xs text-slate-500 mt-1">{error}</p>
            </div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No events found for this session.
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-7 space-y-4 sm:space-y-6 before:absolute before:left-2.5 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {events.map((evt, idx) => {
                const isPageView = evt.event_type === 'page_view';
                const eventDate = new Date(evt.timestamp);

                return (
                  <div key={idx} className="relative group">
                    {/* Timeline Node Dot */}
                    <div
                      className={`absolute -left-[23px] sm:-left-[27px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white shadow-sm transition-transform group-hover:scale-110 shrink-0 ${
                        isPageView
                          ? 'border-purple-500 text-purple-600 ring-2 ring-purple-100'
                          : 'border-teal-500 text-teal-600 ring-2 ring-teal-100'
                      }`}
                    >
                      {isPageView ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <MousePointerClick className="h-3 w-3" />
                      )}
                    </div>

                    {/* Event Card */}
                    <div
                      className={`rounded-xl border p-3.5 sm:p-4 transition-all shadow-sm ${
                        isPageView
                          ? 'border-purple-100 bg-purple-50/20 hover:border-purple-200 hover:bg-purple-50/40'
                          : 'border-teal-100 bg-teal-50/20 hover:border-teal-200 hover:bg-teal-50/40'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                              isPageView
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-teal-100 text-teal-700'
                            }`}
                          >
                            {isPageView ? 'Page View' : 'Click Interaction'}
                          </span>

                          <span className="text-xs text-slate-400 font-mono">
                            #{idx + 1}
                          </span>
                        </div>

                        {/* Timestamp */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>{eventDate.toLocaleTimeString()}</span>
                          <span className="text-slate-300">•</span>
                          <span>{eventDate.toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* URL Display */}
                      <div className="mt-2.5 flex items-start gap-1.5 text-xs text-slate-700">
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                        <span className="font-mono text-slate-600 break-all select-all">
                          {evt.page_url}
                        </span>
                      </div>

                      {/* Badges for Coordinates, Viewport, Element, and Site */}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
                        {!isPageView && evt.coordinates && (
                          <div className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500/10 border border-teal-200/80 px-2.5 py-1 text-xs text-teal-800">
                            <MapPin className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                            <span className="font-semibold">Coordinates:</span>
                            <span className="font-mono font-medium">
                              X: {evt.coordinates.x}px, Y: {evt.coordinates.y}px
                            </span>
                          </div>
                        )}
                        {evt.viewport && (
                          <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 border border-slate-200 px-2 py-1 text-[11px] text-slate-600 font-mono">
                            <span>Screen: {evt.viewport.width}×{evt.viewport.height}px</span>
                          </div>
                        )}
                        {evt.site_id && (
                          <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 border border-slate-200 px-2 py-1 text-[11px] text-slate-600 font-mono">
                            <span>Site: {evt.site_id}</span>
                          </div>
                        )}
                        {!isPageView && evt.element && (
                          <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 px-2 py-1 text-[11px] text-emerald-800 max-w-full">
                            <span className="font-mono font-bold shrink-0">&lt;{evt.element.tag || 'el'}{evt.element.id ? `#${evt.element.id}` : ''}&gt;</span>
                            {evt.element.text && (
                              <span className="font-sans text-emerald-700 truncate max-w-[150px] sm:max-w-[200px]">"{evt.element.text}"</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="border-t border-slate-100 bg-slate-50/80 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
            {events.length} {events.length === 1 ? 'event' : 'events'} recorded in this session
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ml-auto shadow-sm"
          >
            Close Journey
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
