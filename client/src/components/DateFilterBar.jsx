import React, { useState, useEffect } from 'react';
import { Calendar, RotateCcw, X, SlidersHorizontal, Check, ChevronDown } from 'lucide-react';

export const DATE_PRESETS = [
  { id: 'today',      label: 'Today',        subtitle: 'Current day' },
  { id: 'yesterday',  label: 'Yesterday',    subtitle: 'Previous full day' },
  { id: '7d',         label: '7 Days',       subtitle: 'Past 168 hours' },
  { id: '30d',        label: '30 Days',      subtitle: 'Past 30 days' },
  { id: 'this_month', label: 'This Month',   subtitle: 'Current calendar month' },
  { id: 'last_month', label: 'Last Month',   subtitle: 'Previous calendar month' },
  { id: 'this_year',  label: 'This Year',    subtitle: 'Current calendar year' },
  { id: 'last_year',  label: 'Last Year',    subtitle: 'Previous calendar year' },
  { id: 'all',        label: 'All Time',     subtitle: 'All recorded events' },
  { id: 'custom',     label: 'Custom…',      subtitle: 'Specific date range' },
];

export const GROUPING_OPTIONS = [
  { id: 'auto',    label: 'Auto' },
  { id: 'hourly',  label: 'Hourly' },
  { id: 'daily',   label: 'Daily' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly',  label: 'Yearly' },
];

export default function DateFilterBar({
  timeRange,
  onTimeRangeChange,
  startDate,
  endDate,
  onCustomDateChange,
  groupBy,
  onGroupByChange,
  showGrouping = false,
  className = '',
}) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate || new Date().toISOString().slice(0, 10));
  const [tempEnd,   setTempEnd]   = useState(endDate   || new Date().toISOString().slice(0, 10));
  const [customError, setCustomError] = useState(null);

  useEffect(() => {
    if (startDate) setTempStart(startDate);
    if (endDate)   setTempEnd(endDate);
  }, [startDate, endDate]);

  const handleApply = (e) => {
    e.preventDefault();
    if (!tempStart || !tempEnd) { setCustomError('Please choose both dates.'); return; }
    if (new Date(tempStart) > new Date(tempEnd)) { setCustomError('Start date cannot be after end date.'); return; }
    setCustomError(null);
    onCustomDateChange(tempStart, tempEnd);
    onTimeRangeChange('custom');
    setIsCustomOpen(false);
  };

  const handleReset = () => {
    onTimeRangeChange('all');
    onCustomDateChange(null, null);
    if (onGroupByChange) onGroupByChange('auto');
  };

  const isActive = timeRange !== 'all' || (groupBy && groupBy !== 'auto') || startDate !== null;
  const currentPreset = DATE_PRESETS.find((p) => p.id === timeRange) || DATE_PRESETS[8];
  const displayText = timeRange === 'custom' && startDate && endDate
    ? `${startDate} → ${endDate}`
    : currentPreset.label;

  return (
    <section
      aria-label="Analytics date and interval filters"
      className={`card px-4 py-3.5 ${className}`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

        {/* Left: Preset buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400 shrink-0">
            <Calendar className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" />
            <span>Range</span>
          </div>

          <div
            role="toolbar"
            aria-label="Preset time ranges"
            className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-50 border border-slate-200/80 p-1"
          >
            {DATE_PRESETS.map((preset) => {
              const active = timeRange === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => { preset.id === 'custom' ? setIsCustomOpen(true) : onTimeRangeChange(preset.id); }}
                  title={preset.subtitle}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                    active
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/70'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: grouping + active pill + reset */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 border-t border-slate-100 pt-2.5 lg:border-t-0 lg:pt-0">
          {showGrouping && onGroupByChange && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <label htmlFor="group-by-select" className="font-semibold cursor-pointer">Group:</label>
              <select
                id="group-by-select"
                value={groupBy || 'auto'}
                onChange={(e) => onGroupByChange(e.target.value)}
                className="cf-select text-xs py-1.5"
              >
                {GROUPING_OPTIONS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
            </div>
          )}

          {/* Active range indicator */}
          <div
            aria-live="polite"
            className="badge badge-teal gap-1.5"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" aria-hidden="true" />
            {displayText}
          </div>

          {/* Reset button */}
          {isActive && (
            <button
              type="button"
              onClick={handleReset}
              title="Reset all time filters (preserves data)"
              className="btn-ghost btn-sm text-slate-500 hover:text-slate-800"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Custom date range modal */}
      {isCustomOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onClick={() => setIsCustomOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="custom-range-title"
        >
          <div
            className="animate-scale-in w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-modal)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50">
                  <Calendar className="h-4 w-4 text-teal-600" aria-hidden="true" />
                </div>
                <h3 id="custom-range-title" className="text-sm font-bold text-slate-900">Custom Date Range</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomOpen(false)}
                className="btn-ghost p-1.5 rounded-lg text-slate-400"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleApply} className="mt-4 space-y-4">
              <div>
                <label htmlFor="cdr-start" className="block text-xs font-semibold text-slate-700 mb-1.5">Start Date</label>
                <input
                  id="cdr-start"
                  type="date"
                  value={tempStart}
                  max={tempEnd || new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setTempStart(e.target.value)}
                  className="cf-input text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="cdr-end" className="block text-xs font-semibold text-slate-700 mb-1.5">End Date</label>
                <input
                  id="cdr-end"
                  type="date"
                  value={tempEnd}
                  min={tempStart}
                  onChange={(e) => setTempEnd(e.target.value)}
                  className="cf-input text-sm"
                  required
                />
              </div>

              {customError && (
                <div role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {customError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsCustomOpen(false)} className="btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn-primary btn-sm">
                  <Check className="h-3.5 w-3.5" />
                  Apply Range
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
