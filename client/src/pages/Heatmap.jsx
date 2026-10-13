import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  MousePointerClick,
  Layers,
  MapPin,
  Sliders,
  ExternalLink,
  Info,
  Loader2,
  Calendar,
  Sparkles,
  RefreshCw,
  Eye,
  Maximize2,
  Smartphone,
  Monitor,
  Tablet,
  ZoomIn,
  List,
} from 'lucide-react';
import api from '../services/api';
import DateFilterBar from '../components/DateFilterBar';
import SessionDetailModal from '../components/SessionDetailModal';

export default function Heatmap({ onSeed, isSeeding, selectedSite = 'cf_demo_site' }) {
  const [pages, setPages] = useState([]);
  const [selectedUrl, setSelectedUrl] = useState('');
  const [heatmapData, setHeatmapData] = useState(null);
  const [loadingPages, setLoadingPages] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  // Date filter state
  const [timeRange, setTimeRange] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Visualization settings
  const [displayType, setDisplayType] = useState('canvas'); // 'canvas' | 'overlay' | 'list'
  const [viewMode, setViewMode] = useState('density'); // 'density' | 'pins'
  const [radius, setRadius] = useState(35);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [viewportFilter, setViewportFilter] = useState('all'); // 'all' | 'desktop' | 'tablet' | 'mobile'
  const [canvasScale, setCanvasScale] = useState(1); // 1 | 0.75 | 0.5

  const canvasRef = useRef(null);
  const iframeRef = useRef(null);
  // Actual full-document scroll height read from the iframe after it loads.
  // This is the REAL page height (e.g. 3500px) vs. viewport.height (914px).
  const [iframeNaturalHeight, setIframeNaturalHeight] = useState(null);

  // Load distinct pages matching selectedSite and date filter
  useEffect(() => {
    let isMounted = true;
    async function loadPages() {
      try {
        setLoadingPages(true);
        const pageList = await api.getHeatmapPages(selectedSite, timeRange, startDate, endDate);
        if (isMounted) {
          setPages(pageList);
          if (pageList.length > 0) {
            // Preserve current selectedUrl if it still exists in the filtered page list
            setSelectedUrl((current) => (pageList.includes(current) ? current : pageList[0]));
          } else {
            setSelectedUrl('');
            setHeatmapData(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to fetch pages with recorded clicks');
        }
      } finally {
        if (isMounted) setLoadingPages(false);
      }
    }

    loadPages();
    return () => {
      isMounted = false;
    };
  }, [selectedSite, timeRange, startDate, endDate]);

  // Reset iframe measured height whenever the target URL changes so the new
  // page's height is re-read on load instead of showing the old page's height.
  useEffect(() => {
    setIframeNaturalHeight(null);
  }, [selectedUrl]);

  // Fetch heatmap coordinate data whenever selectedUrl, selectedSite, or date filters change
  useEffect(() => {
    if (!selectedUrl) {
      setHeatmapData(null);
      return;
    }

    let isMounted = true;
    async function fetchClicks() {
      try {
        setLoadingData(true);
        // Clear previous click data immediately to prevent stale markers from lingering
        setHeatmapData(null);
        setError(null);
        const data = await api.getHeatmapData(selectedUrl, selectedSite, timeRange, startDate, endDate);
        if (isMounted) {
          setHeatmapData(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load heatmap data');
        }
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }

    fetchClicks();
    return () => {
      isMounted = false;
    };
  }, [selectedUrl, selectedSite, timeRange, startDate, endDate]);

  const rawCoordinates = heatmapData?.coordinates || [];

  // Filter coordinates based on device viewport
  const coordinates = rawCoordinates.filter((pt) => {
    if (viewportFilter === 'all') return true;
    const w = pt.viewport?.width;
    if (!w) return true; // untagged defaults to visible
    if (viewportFilter === 'mobile') return w < 768;
    if (viewportFilter === 'tablet') return w >= 768 && w < 1024;
    if (viewportFilter === 'desktop') return w >= 1024;
    return true;
  });

  const totalClicks = rawCoordinates.length;
  const uniqueDeviceTypes = Array.from(new Set(rawCoordinates.map((p) => {
    const w = p.doc_width || p.viewport?.width;
    if (!w) return 'desktop';
    return w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop';
  })));
  const hasMixedViewports = uniqueDeviceTypes.length > 1;

  // ---------------------------------------------------------------------------
  // COORDINATE SYSTEM DOCUMENTATION
  // ---------------------------------------------------------------------------
  // All stored coordinates are document-relative (pageX, pageY):
  //   x = 0 is the left edge of the page, regardless of horizontal scroll.
  //   y = 0 is the top edge of the page, regardless of vertical scroll.
  //
  // Each click records (in order of preference for reference dimensions):
  //   1. doc_width / doc_height    — full scrollable document size (preferred, newer events)
  //   2. viewport.width / .height  — browser window size (fallback for legacy events)
  //
  // KEY INSIGHT: For a non-scrolling page, doc_width == viewport.width.
  // When doc_width is absent, viewport.width is the correct reference because
  // it is the ACTUAL width the page was rendered at when the user clicked.
  // Using maxX+padding was wrong — maxX is 1440 on a 1912px-wide page, giving
  // a 1640px inferred width vs the real 1912px, causing ~15% horizontal error.
  //
  // For the COORDINATE CANVAS mode:
  //   The canvas is sized to fit the viewport width reference × viewport height.
  //   Coordinates are drawn 1:1 with no scaling needed.
  //
  // For the PAGE OVERLAY mode:
  //   The iframe is rendered at its true original width (originalDocWidth)
  //   then CSS-transformed to fit OVERLAY_CONTAINER_WIDTH:
  //   scaleX = OVERLAY_CONTAINER_WIDTH / originalDocWidth
  //   renderedX = originalX * scaleX
  //   renderedY = originalY * scaleY  (uniform scale)
  // ---------------------------------------------------------------------------

  // Compute the representative original document dimensions from stored click data.
  // Adapts to current viewport filter (desktop, tablet, mobile) for exact layout matching.
  const getModalDocDimensions = () => {
    // Determine relevant points based on active viewport filter
    let targetPoints = coordinates;
    if (viewportFilter === 'mobile') {
      targetPoints = rawCoordinates.filter((p) => (p.viewport?.width || p.doc_width || 0) < 768);
    } else if (viewportFilter === 'tablet') {
      targetPoints = rawCoordinates.filter((p) => {
        const w = p.viewport?.width || p.doc_width || 0;
        return w >= 768 && w < 1024;
      });
    } else if (viewportFilter === 'desktop') {
      targetPoints = rawCoordinates.filter((p) => (p.viewport?.width || p.doc_width || 0) >= 1024);
    }

    const countMap = (arr) => {
      const m = {};
      arr.forEach((v) => { m[v] = (m[v] || 0) + 1; });
      return Number(Object.entries(m).sort((a, b) => b[1] - a[1])[0][0]);
    };

    // Priority 1: events with explicit doc_width/doc_height
    const ptsWithDoc = targetPoints.filter((p) => p.doc_width && p.doc_height);
    if (ptsWithDoc.length > 0) {
      return {
        docWidth: countMap(ptsWithDoc.map((p) => p.doc_width)),
        docHeight: countMap(ptsWithDoc.map((p) => p.doc_height)),
        isInferred: false,
        source: 'doc_dims',
      };
    }

    // Priority 2: use viewport.width/height from stored events
    const ptsWithVp = targetPoints.filter((p) => p.viewport?.width && p.viewport?.height);
    if (ptsWithVp.length > 0) {
      return {
        docWidth: countMap(ptsWithVp.map((p) => p.viewport.width)),
        docHeight: countMap(ptsWithVp.map((p) => p.viewport.height)),
        isInferred: true,
        source: 'viewport',
      };
    }

    // Fallback defaults per device breakpoint
    if (viewportFilter === 'mobile') {
      return { docWidth: 390, docHeight: 2800, isInferred: true, source: 'default_mobile' };
    }
    if (viewportFilter === 'tablet') {
      return { docWidth: 768, docHeight: 3200, isInferred: true, source: 'default_tablet' };
    }
    return { docWidth: 1440, docHeight: 3800, isInferred: true, source: 'default_desktop' };
  };

  const { docWidth: originalDocWidth, docHeight: originalDocHeight, isInferred: dimensionsInferred, source: dimensionSource } = getModalDocDimensions();

  // Canvas mode: sized to match the reference viewport width × height so the
  // 1:1 coordinate plot correctly represents the full original page area.
  const canvasWidth = Math.max(originalDocWidth, coordinates.length > 0 ? Math.max(...coordinates.map((c) => c.x)) + 100 : 1000);
  const canvasHeight = Math.max(originalDocHeight, coordinates.length > 0 ? Math.max(...coordinates.map((c) => c.y)) + 120 : 800);

  // Overlay mode: Adaptive preview sizing.
  // - Mobile: 1:1 phone width (390px) without distortion.
  // - Tablet: 1:1 tablet width (768px).
  // - Desktop: containerWidth is 1200px (or full 1440px when unscaled 100% zoom selected).
  const getOverlayLayout = () => {
    let previewWidth = originalDocWidth;
    let containerWidth = 1200;

    if (viewportFilter === 'mobile') {
      previewWidth = originalDocWidth <= 600 ? originalDocWidth : 390;
      containerWidth = previewWidth; // 1:1 mobile phone viewport
    } else if (viewportFilter === 'tablet') {
      previewWidth = (originalDocWidth >= 600 && originalDocWidth < 1024) ? originalDocWidth : 768;
      containerWidth = previewWidth; // 1:1 tablet viewport
    } else {
      // Desktop / All
      previewWidth = originalDocWidth >= 1024 ? originalDocWidth : 1440;
      containerWidth = canvasScale === 1 ? Math.min(1200, previewWidth) : Math.round(1200 * canvasScale);
    }

    const scaleX = previewWidth > 0 ? containerWidth / previewWidth : 1;
    const scaleY = scaleX; // uniform scaling
    const effectiveHeight = iframeNaturalHeight || originalDocHeight || 3800;
    const containerHeight = Math.round(effectiveHeight * scaleY);

    return {
      previewWidth,
      containerWidth,
      scaleX,
      scaleY,
      effectiveHeight,
      containerHeight,
    };
  };

  const {
    previewWidth: overlayPreviewWidth,
    containerWidth: overlayContainerWidth,
    scaleX: overlayScaleX,
    scaleY: overlayScaleY,
    effectiveHeight: effectiveDocHeight,
    containerHeight: overlayContainerHeight,
  } = getOverlayLayout();

  // Preview iframe URL with cache/preview guard
  const previewIframeUrl = selectedUrl
    ? `${selectedUrl}${selectedUrl.includes('?') ? '&' : '?'}cf_preview=1`
    : '';

  // Debug mode: toggleable panel showing scale calculations
  const [debugMode, setDebugMode] = useState(false);

  // Render HTML5 Heatmap Density on Canvas (Canvas mode — 1:1 coordinate plot)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || coordinates.length === 0) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (viewMode === 'density') {
      // 1. Draw radial heat points with overlapping alpha
      coordinates.forEach((pt) => {
        const radGrad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);
        radGrad.addColorStop(0, 'rgba(239, 68, 68, 0.7)'); // Hot Red center
        radGrad.addColorStop(0.3, 'rgba(249, 115, 22, 0.5)'); // Orange
        radGrad.addColorStop(0.6, 'rgba(234, 179, 8, 0.3)'); // Yellow
        radGrad.addColorStop(0.85, 'rgba(20, 184, 166, 0.15)'); // Cyan/Teal
        radGrad.addColorStop(1, 'rgba(20, 184, 166, 0)'); // Transparent edge

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Add subtle focal dots at exact center coordinates
      coordinates.forEach((pt) => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      // Pin Mode: Distinct high-contrast dots with border
      coordinates.forEach((pt) => {
        ctx.fillStyle = '#14b8a6';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }
  }, [coordinates, viewMode, radius, canvasWidth, canvasHeight]);

  // Handle canvas mouse hover to display coordinate tooltips
  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || coordinates.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Find closest click within threshold
    const hitThreshold = 18;
    const closest = coordinates.find(
      (pt) => Math.hypot(pt.x - mouseX, pt.y - mouseY) <= hitThreshold
    );

    setHoveredPoint(closest ? { ...closest, mouseClientX: e.clientX, mouseClientY: e.clientY } : null);
  };


  return (
    <div className="space-y-5 animate-fade-slide-in">
      {/* Date Filter Bar */}
      <DateFilterBar
        timeRange={timeRange}
        onTimeRangeChange={(range) => {
          setTimeRange(range);
          if (range !== 'custom') {
            setStartDate(null);
            setEndDate(null);
          }
        }}
        startDate={startDate}
        endDate={endDate}
        onCustomDateChange={(s, e) => {
          setStartDate(s);
          setEndDate(e);
        }}
      />

      {/* Heatmap Control & Page Selector Bar */}
      <div className="card flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 sm:p-5">
        <div className="flex-1 max-w-xl space-y-1">
          <label htmlFor="heatmap-target-url" className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 cursor-pointer">
            <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />
            <span>Target Page URL</span>
          </label>

          {loadingPages ? (
            <div className="h-9 w-full bg-slate-100 animate-pulse rounded-lg"></div>
          ) : pages.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              No click events recorded yet for this website property.
            </p>
          ) : (
            <select
              id="heatmap-target-url"
              value={selectedUrl}
              onChange={(e) => setSelectedUrl(e.target.value)}
              className="cf-select w-full text-xs sm:text-sm font-mono"
            >
              {pages.map((url) => (
                <option key={url} value={url}>
                  {url}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Visualization Toggles */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Display Mode: Canvas vs Overlay vs List */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-medium" role="group" aria-label="Display mode">
            <button
              onClick={() => setDisplayType('canvas')}
              aria-pressed={displayType === 'canvas'}
              className={`rounded-md px-2.5 py-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                displayType === 'canvas'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Coordinate Canvas
            </button>
            <button
              onClick={() => setDisplayType('overlay')}
              aria-pressed={displayType === 'overlay'}
              className={`rounded-md px-2.5 py-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                displayType === 'overlay'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Page Overlay
            </button>
            <button
              onClick={() => setDisplayType('list')}
              aria-pressed={displayType === 'list'}
              className={`rounded-md px-2.5 py-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                displayType === 'list'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Click List
            </button>
          </div>

          {/* View Mode: Density vs Pins */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-medium" role="group" aria-label="Heatmap visualization style">
            <button
              onClick={() => setViewMode('density')}
              aria-pressed={viewMode === 'density'}
              className={`rounded-md px-2.5 py-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                viewMode === 'density'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Density
            </button>
            <button
              onClick={() => setViewMode('pins')}
              aria-pressed={viewMode === 'pins'}
              className={`rounded-md px-2.5 py-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                viewMode === 'pins'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pins
            </button>
          </div>

          {/* Viewport Device Filter */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs" role="group" aria-label="Viewport filter">
            <Monitor className="h-3.5 w-3.5 text-slate-400 mx-1.5" aria-hidden="true" />
            <label htmlFor="heatmap-viewport-filter" className="sr-only">Device Viewport Filter:</label>
            <select
              id="heatmap-viewport-filter"
              value={viewportFilter}
              onChange={(e) => setViewportFilter(e.target.value)}
              className="bg-transparent font-semibold text-xs text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 cursor-pointer pr-1"
            >
              <option value="all">All Viewports</option>
              <option value="desktop">Desktop (≥ 1024px)</option>
              <option value="tablet">Tablet (768–1023px)</option>
              <option value="mobile">Mobile (&lt; 768px)</option>
            </select>
          </div>

          {/* Zoom / Scale Selector */}
          <div className="hidden sm:flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-medium" role="group" aria-label="Canvas zoom level">
            <ZoomIn className="h-3.5 w-3.5 text-slate-400 ml-1" aria-hidden="true" />
            <button
              onClick={() => setCanvasScale(1)}
              aria-pressed={canvasScale === 1}
              className={`rounded px-1.5 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${canvasScale === 1 ? 'bg-white font-bold shadow-sm' : 'text-slate-500'}`}
            >
              100%
            </button>
            <button
              onClick={() => setCanvasScale(0.75)}
              aria-pressed={canvasScale === 0.75}
              className={`rounded px-1.5 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${canvasScale === 0.75 ? 'bg-white font-bold shadow-sm' : 'text-slate-500'}`}
            >
              75%
            </button>
            <button
              onClick={() => setCanvasScale(0.5)}
              aria-pressed={canvasScale === 0.5}
              className={`rounded px-1.5 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${canvasScale === 0.5 ? 'bg-white font-bold shadow-sm' : 'text-slate-500'}`}
            >
              50%
            </button>
          </div>

          {viewMode === 'density' && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white text-xs">
              <label htmlFor="heatmap-radius-slider" className="flex items-center cursor-pointer">
                <Sliders className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <span className="sr-only">Density Radius:</span>
              </label>
              <input
                id="heatmap-radius-slider"
                type="range"
                min={20}
                max={60}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-16 accent-teal-600 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                title="Density radius"
              />
              <span className="font-mono text-slate-700 text-[11px]">{radius}px</span>
            </div>
          )}
        </div>
      </div>

      {/* Heatmap Stats Strip */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
        <div className="card p-3.5 sm:p-4 group">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Clicks</span>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{totalClicks}</span>
            <span className="badge badge-teal text-[9px]">{coordinates.length} filtered</span>
          </div>
        </div>

        <div className="card p-3.5 sm:p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Coordinate Range</span>
          <div className="mt-1.5 text-xs font-mono font-semibold text-slate-700 leading-relaxed">
            {coordinates.length > 0 ? (
              <span>
                X: 0–{Math.max(...coordinates.map((c) => c.x))}px <br /> Y: 0–{Math.max(...coordinates.map((c) => c.y))}px
              </span>
            ) : '—'}
          </div>
        </div>

        <div className="card p-3.5 sm:p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Coordinate Space</span>
          <div className="mt-1.5 text-xs font-semibold text-slate-700">
            Document-relative <br />
            <span className="font-mono text-[10px] text-slate-400">(pageX, pageY)</span>
          </div>
        </div>

        <div className="card p-3.5 sm:p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Density Scale</span>
          <div className="mt-2.5 space-y-1">
            <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-teal-400 via-amber-400 to-rose-500" />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>Cool</span><span>Hot</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Heatmap Visualization Viewport */}
      <div className="card overflow-hidden">
        {/* Viewport Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">
              {displayType === 'overlay'
                ? 'Page Preview Overlay'
                : displayType === 'list'
                ? 'Click Coordinate Table'
                : 'Document Coordinate Canvas'}
            </span>
            <span className="rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
              {displayType === 'list'
                ? `${coordinates.length} records`
                : displayType === 'overlay'
                ? `${overlayContainerWidth} × ${overlayContainerHeight} px (scale ${overlayScaleX.toFixed(3)})`
                : `${canvasWidth} × ${canvasHeight} px`}
            </span>
            {displayType !== 'list' && canvasScale !== 1 && (
              <span className="rounded bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.5 text-[10px] font-bold">
                Zoom: {Math.round(canvasScale * 100)}%
              </span>
            )}
            {displayType === 'overlay' && dimensionsInferred && (
              <span className="rounded bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold">
                ⚠ Dims inferred
              </span>
            )}
          </div>

          {displayType !== 'list' && (
            <div className="flex items-center gap-3 text-slate-500 text-[10px] sm:text-[11px]">
              {displayType === 'overlay' && (
                <button
                  onClick={() => setDebugMode((d) => !d)}
                  className={`rounded px-2 py-0.5 border text-[10px] font-semibold transition-colors ${
                    debugMode
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-teal-400'
                  }`}
                  title="Toggle debug overlay showing raw coords, doc dims, and scale factors"
                >
                  🐛 Debug
                </button>
              )}
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-teal-500"></span> Cold
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span> Moderate
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500"></span> Hot (Frequent)
              </span>
            </div>
          )}
        </div>

        {/* Display Area: Table or Canvas */}
        <div className="relative overflow-auto max-h-[750px] bg-slate-900/5 p-3 sm:p-6">
          {loadingData ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              <span className="text-xs font-medium">Loading coordinate data...</span>
            </div>
          ) : coordinates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Flame className="h-10 w-10 text-slate-300 mb-2" />
              <h4 className="text-sm font-semibold text-slate-800">No Clicks for this Page</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                No click events recorded for the selected URL and viewport filter. Try clicking elements on the demo page.
              </p>
              <button
                onClick={onSeed}
                disabled={isSeeding}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-700 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Simulate Demo Clicks</span>
              </button>
            </div>
          ) : displayType === 'list' ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-xs border-collapse" aria-label="Click coordinate records table">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th scope="col" className="py-3 px-4">#</th>
                    <th scope="col" className="py-3 px-4">Coordinates (X, Y)</th>
                    <th scope="col" className="py-3 px-4">Target Element</th>
                    <th scope="col" className="py-3 px-4">Screen Viewport</th>
                    <th scope="col" className="py-3 px-4">Device</th>
                    <th scope="col" className="py-3 px-4">Timestamp</th>
                    <th scope="col" className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coordinates.map((pt, idx) => {
                    const w = pt.viewport?.width || 0;
                    const deviceLabel = !w ? 'Default' : w < 768 ? 'Mobile' : w < 1024 ? 'Tablet' : 'Desktop';
                    const deviceColor =
                      !w
                        ? 'bg-slate-100 text-slate-600'
                        : w < 768
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : w < 1024
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-teal-50 text-teal-700 border-teal-200';

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-800">
                            ({pt.x}px, {pt.y}px)
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {pt.element ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60 max-w-[200px] truncate" title={pt.element.text || pt.element.id}>
                              &lt;{pt.element.tag}{pt.element.id ? `#${pt.element.id}` : ''}&gt;
                              {pt.element.text && <span className="font-sans text-teal-600 truncate">"{pt.element.text}"</span>}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                          {pt.viewport ? `${pt.viewport.width} × ${pt.viewport.height}px` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold ${deviceColor}`}>
                            {deviceLabel}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {new Date(pt.timestamp).toLocaleTimeString()} • {new Date(pt.timestamp).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {pt.session_id ? (
                            <button
                              onClick={() => setSelectedSessionId(pt.session_id)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-teal-400 hover:text-teal-700 shadow-sm transition-colors"
                            >
                              Inspect Session
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : displayType === 'overlay' ? (
            // -----------------------------------------------------------------
            // PAGE OVERLAY MODE: iframe + scaled coordinate markers
            // -----------------------------------------------------------------
            // The iframe is rendered at its native document width (overlayPreviewWidth)
            // and CSS-transformed to fit overlayContainerWidth.
            // Markers are positioned at (pt.x * overlayScaleX, pt.y * overlayScaleY).
            // When unscaled (scale=1.0), marker position exactly equals pt.x and pt.y (0.0px error).
            // -----------------------------------------------------------------
            <div
              className="relative mx-auto rounded-xl shadow-md border border-slate-300/80 bg-white"
              style={{
                width: `${overlayContainerWidth}px`,
                maxHeight: '75vh',
                overflowY: 'auto',
                overflowX: 'hidden',
              }}
            >
              {/* Inner wrapper sized to the full scaled document — markers are
                  positioned absolutely inside here so they align from top to bottom. */}
              <div
                className="relative"
                style={{ width: `${overlayContainerWidth}px`, height: `${overlayContainerHeight}px` }}
              >
                {/* iframe rendered at FULL original document width */}
                <iframe
                  ref={iframeRef}
                  src={previewIframeUrl}
                  name="cf_heatmap_preview"
                  title="Page Preview"
                  className="absolute top-0 left-0 border-0 pointer-events-none"
                  style={{
                    width: `${overlayPreviewWidth}px`,
                    height: iframeNaturalHeight ? `${iframeNaturalHeight}px` : '5000px',
                    transformOrigin: 'top left',
                    transform: `scale(${overlayScaleX})`,
                    opacity: iframeNaturalHeight ? 0.92 : 0,
                    transition: 'opacity 0.3s ease',
                  }}
                  onLoad={() => {
                    try {
                      const doc = iframeRef.current?.contentDocument;
                      if (!doc) return;
                      const scrollH =
                        doc.documentElement?.scrollHeight ||
                        doc.body?.scrollHeight ||
                        0;
                      if (scrollH > 100) {
                        setIframeNaturalHeight(scrollH);
                      }
                    } catch (e) {
                      setIframeNaturalHeight(4000);
                    }
                  }}
                />

                {/* Click markers — positioned using EXACT scale transformation.
                    For a click recorded at (pt.x, pt.y), rendered position is
                    (pt.x * overlayScaleX, pt.y * overlayScaleY).
                    When scaleX == 1, rendered coordinates equal physical pixel coordinates. */}
                {coordinates.map((pt, idx) => {
                  const rx = pt.x * overlayScaleX;
                  const ry = pt.y * overlayScaleY;
                  const scaledR = Math.max(6, Math.round(radius * overlayScaleX));
                  return (
                    <div
                      key={idx}
                      className="absolute pointer-events-none"
                      style={{
                        left: `${rx.toFixed(2)}px`,
                        top: `${ry.toFixed(2)}px`,
                        zIndex: 20,
                      }}
                      title={`Click #${idx + 1}: (${pt.x}px, ${pt.y}px)${pt.element?.tag ? ` on <${pt.element.tag}${pt.element.id ? `#${pt.element.id}` : ''}> ${pt.element.text ? `"${pt.element.text}"` : ''}` : ''} | rendered (${rx.toFixed(1)}px, ${ry.toFixed(1)}px)`}
                    >
                      {viewMode === 'density' ? (
                        <div
                          style={{
                            width: `${scaledR * 2}px`,
                            height: `${scaledR * 2}px`,
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(239,68,68,0.75) 0%, rgba(249,115,22,0.4) 40%, rgba(20,184,166,0.1) 80%, transparent 100%)',
                            transform: 'translate(-50%, -50%)',
                            mixBlendMode: 'multiply',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: '#14b8a6',
                            border: '2px solid white',
                            boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
                            transform: 'translate(-50%, -50%)',
                          }}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Scale info watermark — sticky at the bottom */}
                <div
                  className="absolute bottom-2 right-2 z-30 rounded bg-black/60 px-2 py-1 text-[10px] font-mono text-white/80 pointer-events-none"
                >
                  scale: {overlayScaleX.toFixed(3)} | ref: {overlayPreviewWidth}×{effectiveDocHeight}px
                  {!iframeNaturalHeight && ' (measuring…)'}
                  {dimensionsInferred && ` [${dimensionSource}]`}
                </div>

                {/* Debug panel */}
                {debugMode && coordinates.length > 0 && (
                  <div className="absolute top-2 left-2 z-40 rounded-lg bg-slate-950/90 p-3 text-[10px] font-mono text-teal-300 max-w-xs shadow-xl pointer-events-none space-y-1">
                    <div className="text-teal-400 font-bold text-[11px] mb-1">🐛 Overlay Debug</div>
                    <div>Container: {overlayContainerWidth} × {overlayContainerHeight}px</div>
                    <div>Ref width: {overlayPreviewWidth}px [{dimensionSource}]</div>
                    <div>Effective height: {effectiveDocHeight}px {iframeNaturalHeight ? '(measured)' : '(estimated)'}</div>
                    <div>Scale Factor: {overlayScaleX.toFixed(4)}</div>
                    <div className="border-t border-teal-800 pt-1 mt-1">Sample points (render alignment):</div>
                    {coordinates.slice(0, 3).map((pt, i) => {
                      const rx = (pt.x * overlayScaleX).toFixed(1);
                      const ry = (pt.y * overlayScaleY).toFixed(1);
                      return (
                        <div key={i}>
                          #{i + 1}: src({pt.x}, {pt.y}) → render({rx}, {ry})
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // -----------------------------------------------------------------
            // COORDINATE CANVAS MODE: 1:1 HTML5 Canvas Coordinate Plot
            // -----------------------------------------------------------------
            <div
              className="origin-top-left transition-transform duration-200"
              style={{ transform: `scale(${canvasScale})` }}
            >
              <div
                className="relative mx-auto rounded-xl border border-slate-700/60 shadow-xl overflow-hidden bg-slate-950"
                style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}
              >
                <canvas
                  ref={canvasRef}
                  width={canvasWidth}
                  height={canvasHeight}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="block cursor-crosshair"
                />

                {/* Canvas Hover Tooltip */}
                {hoveredPoint && (
                  <div
                    className="absolute pointer-events-none z-30 rounded-lg bg-slate-900/95 border border-slate-700 p-2.5 text-xs text-white shadow-xl backdrop-blur-md"
                    style={{
                      left: `${Math.min(canvasWidth - 180, Math.max(10, hoveredPoint.x + 15))}px`,
                      top: `${Math.min(canvasHeight - 90, Math.max(10, hoveredPoint.y - 45))}px`,
                    }}
                  >
                    <div className="font-mono text-teal-400 font-bold">
                      ({hoveredPoint.x}px, {hoveredPoint.y}px)
                    </div>
                    {hoveredPoint.element && (
                      <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                        &lt;{hoveredPoint.element.tag}{hoveredPoint.element.id ? `#${hoveredPoint.element.id}` : ''}&gt;
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(hoveredPoint.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Heatmap Footer Legend & Info */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 p-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-slate-400 shrink-0" />
            <span>
              Coordinates plotted 1:1 against document coordinates collected by{' '}
              <code className="font-mono text-slate-800 bg-slate-200/70 px-1 py-0.5 rounded">
                tracker.js
              </code>
              . Use scale, view mode, and viewport filters to inspect responsive layouts.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-slate-500 font-medium">{coordinates.length} points plotted</span>
          </div>
        </div>
      </div>

      {/* Session Modal */}
      {selectedSessionId && (
        <SessionDetailModal
          sessionId={selectedSessionId}
          siteId={selectedSite}
          timeRange={timeRange}
          startDate={startDate}
          endDate={endDate}
          onClose={() => setSelectedSessionId(null)}
        />
      )}
    </div>
  );
}

