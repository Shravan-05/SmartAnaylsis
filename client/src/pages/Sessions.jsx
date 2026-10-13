import React, { useState, useEffect } from 'react';
import {
  Search, Users, Eye, MousePointerClick,
  ChevronLeft, ChevronRight, Copy, Check, Sparkles, Zap, Filter,
} from 'lucide-react';
import api from '../services/api';
import DateFilterBar from '../components/DateFilterBar';
import SessionDetailModal from '../components/SessionDetailModal';

export default function Sessions({ onSeed, isSeeding, selectedSite = 'cf_demo_site' }) {
  const [sessions, setSessions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [timeRange, setTimeRange] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPagination((p) => ({ ...p, page: 1 })); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        setLoading(true); setError(null);
        const res = await api.getSessions({
          page: pagination.page, limit: pagination.limit,
          search: debouncedSearch, site_id: selectedSite,
          time_range: timeRange, startDate, endDate,
        });
        if (alive) {
          setSessions(res.data || []);
          if (res.pagination) setPagination(res.pagination);
        }
      } catch (err) {
        if (alive) setError(err.response?.data?.message || err.message || 'Failed to load sessions');
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [pagination.page, pagination.limit, debouncedSearch, selectedSite, timeRange, startDate, endDate]);

  const copySessionId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (ds) => {
    if (!ds) return '—';
    const d = new Date(ds);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="space-y-5 animate-fade-slide-in">
      {/* Date filters */}
      <DateFilterBar
        timeRange={timeRange}
        onTimeRangeChange={(r) => { setTimeRange(r); if (r !== 'custom') { setStartDate(null); setEndDate(null); } setPagination((p) => ({ ...p, page: 1 })); }}
        startDate={startDate}
        endDate={endDate}
        onCustomDateChange={(s, e) => { setStartDate(s); setEndDate(e); setPagination((p) => ({ ...p, page: 1 })); }}
      />

      {/* Search + controls bar */}
      <div className="card flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4">
        <div className="relative flex-1 max-w-md">
          <label htmlFor="session-search-input" className="sr-only">Search sessions</label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            id="session-search-input"
            type="text"
            placeholder="Search by Session ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="cf-input pl-10 text-xs"
          />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <label htmlFor="sessions-per-page" className="font-medium whitespace-nowrap cursor-pointer">Rows:</label>
            <select
              id="sessions-per-page"
              value={pagination.limit}
              onChange={(e) => setPagination((p) => ({ ...p, limit: Number(e.target.value), page: 1 }))}
              className="cf-select text-xs py-1.5 px-2"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          {pagination.total > 0 && (
            <span className="badge badge-slate text-[11px]">
              {pagination.total} session{pagination.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span className="font-medium">Error: {error}</span>
        </div>
      )}

      {/* Table card */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="cf-table" aria-label="Visitor sessions">
            <thead>
              <tr>
                <th>Session ID</th>
                <th className="text-center">Events</th>
                <th className="text-center hidden sm:table-cell">Page Views</th>
                <th className="text-center hidden sm:table-cell">Clicks</th>
                <th className="hidden lg:table-cell">First Seen</th>
                <th className="hidden lg:table-cell">Last Activity</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td><div className="skeleton h-4 w-44" /></td>
                    <td className="text-center"><div className="skeleton h-5 w-10 mx-auto rounded-full" /></td>
                    <td className="hidden sm:table-cell text-center"><div className="skeleton h-5 w-10 mx-auto rounded-full" /></td>
                    <td className="hidden sm:table-cell text-center"><div className="skeleton h-5 w-10 mx-auto rounded-full" /></td>
                    <td className="hidden lg:table-cell"><div className="skeleton h-3.5 w-32" /></td>
                    <td className="hidden lg:table-cell"><div className="skeleton h-3.5 w-32" /></td>
                    <td className="text-center"><div className="skeleton h-7 w-24 mx-auto rounded-lg" /></td>
                  </tr>
                ))
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="rounded-2xl bg-slate-50 p-5">
                        <Users className="h-10 w-10 text-slate-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-600">No sessions found</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                          Try expanding the date range or browse the ApexCloud demo to create new sessions.
                        </p>
                      </div>
                      {onSeed && (
                        <button
                          onClick={onSeed}
                          disabled={isSeeding}
                          className="btn-primary btn-sm mt-1"
                        >
                          <Zap className="h-3.5 w-3.5" />
                          {isSeeding ? 'Generating…' : 'Simulate Sessions'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sessions.map((s, idx) => (
                  <tr key={s.session_id} className="group">
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-slate-800 truncate max-w-[140px]">{s.session_id}</span>
                        <button
                          onClick={() => copySessionId(s.session_id)}
                          className="rounded p-0.5 text-slate-300 hover:text-slate-600 transition-colors focus-visible:ring-2 focus-visible:ring-teal-500"
                          title="Copy session ID"
                          aria-label={`Copy session ID ${s.session_id}`}
                        >
                          {copiedId === s.session_id
                            ? <Check className="h-3 w-3 text-teal-600" />
                            : <Copy className="h-3 w-3" />
                          }
                        </button>
                        <span className="badge badge-teal text-[9px] hidden sm:inline-flex">{s.site_id || 'cf_demo_site'}</span>
                      </div>
                    </td>
                    <td className="text-center">
                      <span className="badge badge-slate font-bold">{s.total_events}</span>
                    </td>
                    <td className="hidden sm:table-cell text-center">
                      <span className="badge badge-purple gap-1">
                        <Eye className="h-2.5 w-2.5" />{s.page_views}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell text-center">
                      <span className="badge badge-teal gap-1">
                        <MousePointerClick className="h-2.5 w-2.5" />{s.clicks}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell text-[11px] text-slate-500">{formatDate(s.first_event)}</td>
                    <td className="hidden lg:table-cell text-[11px] text-slate-500">{formatDate(s.last_event)}</td>
                    <td className="text-center">
                      <button
                        id={`user-journey-btn-${idx}`}
                        data-testid="user-journey-btn"
                        onClick={() => setSelectedSessionId(s.session_id)}
                        aria-label={`View user journey for ${s.session_id}`}
                        className="btn-secondary btn-sm text-[11px] group-hover:border-teal-300 group-hover:text-teal-700"
                      >
                        User Journey ›
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 text-xs text-slate-500 bg-slate-50/50">
            <span>
              Showing{' '}
              <strong className="text-slate-800">{(pagination.page - 1) * pagination.limit + 1}</strong>
              {' '}–{' '}
              <strong className="text-slate-800">{Math.min(pagination.page * pagination.limit, pagination.total)}</strong>
              {' '}of{' '}
              <strong className="text-slate-800">{pagination.total}</strong> sessions
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                disabled={!pagination.hasPrev}
                aria-label="Previous page"
                className="btn-secondary btn-sm disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <span className="font-semibold text-slate-700 tabular-nums px-1">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                disabled={!pagination.hasNext}
                aria-label="Next page"
                className="btn-secondary btn-sm disabled:opacity-40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedSessionId && (
        <SessionDetailModal
          sessionId={selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
          siteId={selectedSite}
          timeRange={timeRange}
          startDate={startDate}
          endDate={endDate}
        />
      )}
    </div>
  );
}
