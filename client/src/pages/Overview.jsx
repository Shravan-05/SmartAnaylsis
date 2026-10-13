import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Activity, Eye, MousePointerClick, Sparkles, ExternalLink,
  ChevronRight, Flame, Radio, Clock, Copy, Check, RefreshCw, TrendingUp,
  BarChart3, Zap,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../services/api';
import DateFilterBar from '../components/DateFilterBar';
import SessionDetailModal from '../components/SessionDetailModal';
import { useRealtimeEvents, formatRelativeTime } from '../hooks/useRealtimeEvents';

/* ── Custom Recharts tooltip ── */
function ChartTooltip({ active, payload, label, labelFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 shadow-xl text-xs">
      <p className="text-slate-300 mb-1.5 font-medium">{labelFormatter ? labelFormatter(label) : label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-bold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function Overview({ onSeed, isSeeding, selectedSite = 'cf_demo_site' }) {
  const navigate = useNavigate();

  const [timeRange, setTimeRange] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [groupBy, setGroupBy] = useState('auto');

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getStats(selectedSite, timeRange, startDate, endDate, groupBy);
      setStats(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, [selectedSite, timeRange, startDate, endDate, groupBy]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const handleLiveEvent = useCallback((newEvent) => {
    setStats((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        totalEvents: (prev.totalEvents || 0) + 1,
        totalPageViews: (prev.totalPageViews || 0) + (newEvent.event_type === 'page_view' ? 1 : 0),
        totalClicks: (prev.totalClicks || 0) + (newEvent.event_type === 'click' ? 1 : 0),
      };
    });
  }, []);

  const handleLiveReset = useCallback(() => {
    setStats({ site_id: selectedSite, totalSessions: 0, totalEvents: 0, totalPageViews: 0, totalClicks: 0, activityTrend: [], topPages: [], recentSessions: [] });
  }, [selectedSite]);

  const { connectionStatus, liveEvents, lastEventTime, lastEventRelative, refreshLiveFeed } =
    useRealtimeEvents(selectedSite, handleLiveEvent, handleLiveReset);

  const totalSessions  = stats?.totalSessions  || 0;
  const totalEvents    = stats?.totalEvents    || 0;
  const totalPageViews = stats?.totalPageViews || 0;
  const totalClicks    = stats?.totalClicks    || 0;
  const recentSessions = stats?.recentSessions || [];
  const activityTrend  = stats?.activityTrend  || [];
  const topPages       = stats?.topPages       || [];

  const pieData = [
    { name: 'Page Views', value: totalPageViews, pct: totalEvents > 0 ? ((totalPageViews / totalEvents) * 100).toFixed(1) : 0, color: '#8b5cf6' },
    { name: 'Clicks',     value: totalClicks,    pct: totalEvents > 0 ? ((totalClicks    / totalEvents) * 100).toFixed(1) : 0, color: '#14b8a6' },
  ].filter((d) => d.value > 0);

  const copySessionId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const kpis = [
    { title: 'Unique Sessions', value: totalSessions,  icon: Users,             color: 'teal',   subtext: 'Visitor journeys'       },
    { title: 'Total Events',    value: totalEvents,    icon: Activity,          color: 'violet', subtext: 'Tracked interactions'   },
    { title: 'Page Views',      value: totalPageViews, icon: Eye,               color: 'purple', subtext: 'Loads & navigations'    },
    { title: 'Clicks Captured', value: totalClicks,    icon: MousePointerClick, color: 'emerald',subtext: 'With (x,y) coordinates' },
  ];

  const colorMap = {
    teal:    { bg: 'bg-teal-50',   icon: 'text-teal-600',   border: 'border-teal-100'   },
    violet:  { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-100' },
    purple:  { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100' },
    emerald: { bg: 'bg-emerald-50',icon: 'text-emerald-600',border: 'border-emerald-100'},
  };

  const formatTimeTick = (val) => {
    if (!val) return '';
    if (val.includes(' ')) {
      const hourNum = parseInt(val.split(' ')[1], 10);
      if (!isNaN(hourNum)) {
        const ampm = hourNum >= 12 ? 'PM' : 'AM';
        return `${hourNum % 12 || 12}${ampm}`;
      }
    }
    if (val.length === 10) {
      const p = val.split('-');
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${months[+p[1]-1]} ${+p[2]}`;
    }
    if (val.length === 7) {
      const p = val.split('-');
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${months[+p[1]-1]} '${p[0].slice(2)}`;
    }
    return val;
  };

  const formatTooltipLabel = (val) => {
    if (!val) return '';
    if (val.includes(' ')) {
      const [d, h] = val.split(' ');
      const n = parseInt(h, 10);
      return `${d} · ${n % 12 || 12}:00 ${n >= 12 ? 'PM' : 'AM'}`;
    }
    if (val.length === 10) return `Date: ${val}`;
    return val;
  };

  const statusColors = {
    live:       'bg-emerald-400/20 text-emerald-300 border-emerald-500/30',
    connecting: 'bg-amber-400/20   text-amber-300   border-amber-500/30',
    disconnected:'bg-rose-400/20   text-rose-300   border-rose-500/30',
  };

  return (
    <div className="space-y-5 animate-fade-slide-in">

      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-lg border border-slate-700/50">
        {/* Background glow */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-teal-500/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-48 w-48 rounded-full bg-violet-500/8 blur-2xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="badge badge-teal gap-1.5">
                <Sparkles className="h-3 w-3" />
                Full-Stack Analytics
              </span>
              <span className={`badge gap-1.5 border ${statusColors[connectionStatus] || statusColors.disconnected}`}>
                <span className="relative flex h-1.5 w-1.5">
                  {connectionStatus === 'live' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />}
                  <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${connectionStatus === 'live' ? 'bg-emerald-400' : connectionStatus === 'connecting' ? 'bg-amber-400' : 'bg-rose-400'}`} />
                </span>
                <span className="capitalize text-[10px] font-bold">{connectionStatus} Stream</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">ApexCloud Analytics</h1>
            <p className="text-sm text-slate-400 mt-1 max-w-lg leading-relaxed">
              Live telemetry ingestion · MongoDB aggregations · High-precision click heatmaps
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => navigate('/demo')}
              className="btn btn-sm bg-white text-slate-900 hover:bg-slate-100 shadow focus-visible:ring-offset-slate-900"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Demo Site
            </button>
            <button
              onClick={onSeed}
              disabled={isSeeding}
              className="btn btn-sm bg-teal-500/15 border border-teal-500/30 text-teal-300 hover:bg-teal-500/25 disabled:opacity-50 focus-visible:ring-teal-400"
            >
              <Zap className="h-3.5 w-3.5" />
              {isSeeding ? 'Generating…' : 'Simulate Data'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Date filter bar ── */}
      <DateFilterBar
        timeRange={timeRange}
        onTimeRangeChange={(r) => { setTimeRange(r); if (r !== 'custom') { setStartDate(null); setEndDate(null); } }}
        startDate={startDate}
        endDate={endDate}
        onCustomDateChange={(s, e) => { setStartDate(s); setEndDate(e); }}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        showGrouping={true}
      />

      {/* ── Status row ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>
            Last event:{' '}
            <strong className="text-slate-700">
              {lastEventTime ? `${new Date(lastEventTime).toLocaleTimeString()} (${lastEventRelative})` : totalEvents > 0 ? 'Recorded' : 'No events yet'}
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500" />
          <span>cf_demo_site · {loading ? 'Loading…' : `${totalEvents.toLocaleString()} events`}</span>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div role="alert" className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span className="font-medium">Failed to load analytics: {error}</span>
          <button onClick={loadStats} className="btn-danger btn-sm ml-3 shrink-0">Retry</button>
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          const c = colorMap[kpi.color];
          return (
            <div key={idx} className="card p-5 group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{kpi.title}</span>
                <div className={`rounded-xl p-2 ${c.bg} transition-transform group-hover:scale-110`}>
                  <Icon className={`h-4 w-4 ${c.icon}`} aria-hidden="true" />
                </div>
              </div>
              <div className="kpi-value">
                {loading ? <div className="skeleton h-8 w-20" /> : kpi.value.toLocaleString()}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">{kpi.subtext}</p>
            </div>
          );
        })}
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Area chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-teal-600" />
                Activity Over Time
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Events per {stats?.grouping || groupBy || 'time interval'}</p>
            </div>
            <span className="badge badge-teal gap-1.5 text-[10px]">
              <Radio className="h-3 w-3 animate-pulse" />
              Live Telemetry
            </span>
          </div>

          <div className="h-60">
            {loading ? (
              <div className="flex h-full flex-col gap-3 pt-4">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-5/6" />
                <div className="skeleton h-4 w-2/3" />
              </div>
            ) : activityTrend.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <Activity className="h-8 w-8 text-slate-300 mx-auto" />
                </div>
                <p className="text-sm font-semibold text-slate-600">No activity yet</p>
                <p className="text-xs text-slate-400 max-w-xs">
                  Click elements on the <strong className="text-teal-600">Demo Site</strong> or use Simulate Data.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gPV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="gCL" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#14b8a6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tickFormatter={formatTimeTick} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={6} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip labelFormatter={formatTooltipLabel} />} />
                  <Area type="monotone" dataKey="page_views" name="Page Views" stroke="#8b5cf6" strokeWidth={2} fill="url(#gPV)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="clicks"     name="Clicks"     stroke="#14b8a6" strokeWidth={2} fill="url(#gCL)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Donut chart */}
        <div className="card p-5">
          <div className="mb-5 pb-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Event Distribution</h3>
            <p className="text-xs text-slate-400 mt-0.5">Page views vs. click interactions</p>
          </div>

          <div className="h-60 flex flex-col items-center justify-center">
            {loading ? (
              <div className="space-y-2 w-full">
                <div className="skeleton h-32 w-32 rounded-full mx-auto" />
                <div className="skeleton h-3 w-24 mx-auto mt-3" />
              </div>
            ) : pieData.length === 0 ? (
              <div className="text-center text-xs text-slate-400 space-y-2">
                <MousePointerClick className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-slate-500 font-medium">No events yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="44%" innerRadius={52} outerRadius={78} paddingAngle={4} dataKey="value" stroke="none">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v, name, item) => [`${v} (${item.payload.pct}%)`, name]}
                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 10, fontSize: 12, color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" iconType="circle" iconSize={8}
                    formatter={(val, e) => <span className="text-xs text-slate-600 font-medium">{val} ({e.payload.pct}%)</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Live events feed ── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Radio className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Live Event Stream</h3>
              <p className="text-xs text-slate-400">Real-time telemetry from ApexCloud</p>
            </div>
          </div>
          <button onClick={refreshLiveFeed} className="btn-secondary btn-sm" title="Sync stream">
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          {liveEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="rounded-2xl bg-slate-50 p-5">
                <Activity className="h-10 w-10 text-slate-300 mx-auto" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">Waiting for live events</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Click elements on the <strong className="text-teal-600">ApexCloud Demo</strong> to see telemetry appear here instantly.
                </p>
              </div>
            </div>
          ) : (
            <table className="cf-table" aria-label="Live event stream">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Page URL</th>
                  <th className="hidden md:table-cell">Coordinates</th>
                  <th className="hidden sm:table-cell">Session</th>
                  <th className="text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {liveEvents.slice(0, 10).map((ev, idx) => (
                  <tr key={ev.id || ev._id || idx}>
                    <td>
                      {ev.event_type === 'click' ? (
                        <span className="badge badge-teal gap-1">
                          <MousePointerClick className="h-2.5 w-2.5" /> click
                        </span>
                      ) : (
                        <span className="badge badge-purple gap-1">
                          <Eye className="h-2.5 w-2.5" /> page_view
                        </span>
                      )}
                    </td>
                    <td className="font-mono text-[11px] text-slate-600 max-w-[180px] truncate" title={ev.page_url}>
                      {ev.page_url}
                    </td>
                    <td className="hidden md:table-cell font-mono text-[11px]">
                      {ev.coordinates
                        ? <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-700">({ev.coordinates.x}, {ev.coordinates.y})</span>
                        : <span className="text-slate-300">—</span>
                      }
                    </td>
                    <td className="hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] text-slate-600 max-w-[100px] truncate">{ev.session_id}</span>
                        <button
                          onClick={() => copySessionId(ev.session_id)}
                          className="rounded p-0.5 text-slate-300 hover:text-slate-600 transition-colors focus-visible:ring-2 focus-visible:ring-teal-500"
                          aria-label={`Copy session ID ${ev.session_id}`}
                        >
                          {copiedId === ev.session_id
                            ? <Check className="h-3 w-3 text-teal-600" />
                            : <Copy className="h-3 w-3" />
                          }
                        </button>
                      </div>
                    </td>
                    <td className="text-right">
                      <span className="font-medium text-slate-700 text-[11px]">{formatRelativeTime(ev.timestamp)}</span>
                      <span className="block text-[10px] text-slate-400">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Recent sessions + Top pages ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Recent sessions */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Sessions</h3>
              <p className="text-xs text-slate-400">Latest active visitor journeys</p>
            </div>
            <button onClick={() => navigate('/sessions')} className="btn-ghost btn-sm text-teal-600 hover:text-teal-700 hover:bg-teal-50">
              View All <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="skeleton h-3.5 w-48" />
                    <div className="skeleton h-3 w-32" />
                  </div>
                  <div className="skeleton h-7 w-16 rounded-lg" />
                </div>
              ))
            ) : recentSessions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Users className="h-7 w-7 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">No sessions yet</p>
              </div>
            ) : (
              recentSessions.map((s, idx) => (
                <div
                  key={idx}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedSessionId(s.session_id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedSessionId(s.session_id); } }}
                  aria-label={`Inspect session ${s.session_id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors focus:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  <div>
                    <p className="font-mono text-xs font-bold text-slate-800 truncate max-w-[200px]">{s.session_id}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                      <span className="text-purple-600 font-semibold">{s.page_views} views</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-teal-600 font-semibold">{s.clicks} clicks</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-400">{new Date(s.last_event).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <span className="btn-secondary btn-sm text-[11px] shrink-0">Inspect</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top pages */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Top Pages</h3>
              <p className="text-xs text-slate-400">Highest interaction volume</p>
            </div>
            <button onClick={() => navigate('/heatmap')} className="btn-ghost btn-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50">
              Heatmap <Flame className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="skeleton h-3.5 w-56" />
                    <div className="skeleton h-3 w-36" />
                  </div>
                  <div className="skeleton h-6 w-14 rounded-full" />
                </div>
              ))
            ) : topPages.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <TrendingUp className="h-7 w-7 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">No page data yet</p>
              </div>
            ) : (
              topPages.map((p, idx) => {
                const pct = totalEvents > 0 ? Math.round((p.total_events / totalEvents) * 100) : 0;
                return (
                  <div key={idx} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="font-mono text-xs font-semibold text-slate-800 truncate flex-1" title={p.url}>{p.url}</p>
                      <span className="badge badge-slate shrink-0">{p.total_events} events</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 tabular-nums w-6 text-right">{pct}%</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                      <span>{p.page_views} loads</span>
                      <span>·</span>
                      <span>{p.clicks} clicks</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Session detail modal */}
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
