/**
 * Smart Analysis Analytics Tracker (tracker.js)
 * Lightweight, zero-dependency, standalone client-side tracking library.
 * Supports multi-website tracking via site_id, document-coordinate heatmaps,
 * session lifecycle management with inactivity expiry, and automatic SPA navigation detection.
 *
 * COORDINATE SYSTEM & VIEWPORT DOCUMENTATION:
 * -----------------------------------------------------------------------------------------
 * Click coordinates (x, y) are captured using DOCUMENT-RELATIVE coordinates:
 * - x: event.pageX (horizontal offset in pixels from the left edge of the document)
 * - y: event.pageY (vertical offset in pixels from the top edge of the document)
 *   Fallback if pageX/pageY missing: clientX + scrollX, clientY + scrollY.
 *
 * Viewport coordinates (clientX, clientY) and scroll offsets (scrollX, scrollY)
 * are captured synchronously at the click event:
 * - client_x: event.clientX (horizontal offset from current viewport edge)
 * - client_y: event.clientY (vertical offset from current viewport edge)
 * - scroll_x: window.scrollX || window.pageXOffset
 * - scroll_y: window.scrollY || window.pageYOffset
 *
 * Viewport and Document Dimensions at Click Time:
 * - viewport: { width: window.innerWidth, height: window.innerHeight }
 * - doc_width: Math.max(body.scrollWidth, doc.scrollWidth, doc.clientWidth)
 * - doc_height: Math.max(body.scrollHeight, doc.scrollHeight, doc.clientHeight)
 *
 * Element Identification & Physical Coordinates:
 * - Interactive element is identified via event.target.closest('a, button, [role="button"], ...')
 *   to accurately record tag, id, classes, text/label, and bounding rectangle.
 * - The original physical click coordinates (pageX, pageY) are strictly preserved
 *   and NEVER replaced with the center of the element.
 *
 * In-Page Anchor Jump Protection:
 * - When clicking a navbar anchor that only scrolls to an in-page section (e.g. #features, #pricing),
 *   it does NOT trigger a new page_view event. Only genuine pathname or query changes trigger page views.
 *
 * CRITICAL ACCURACY RULE:
 * All event-dependent values (coordinates, element metadata, dimensions, scroll offsets, timestamp, URL)
 * are captured SYNCHRONOUSLY at event execution time. Only the network dispatch
 * is deferred asynchronously (via requestAnimationFrame / fetch keepalive) so the user
 * experiences zero UI lag and coordinates are never corrupted by subsequent layout shifts.
 * -----------------------------------------------------------------------------------------
 */

(function (window, document) {
  'use strict';

  // Prevent duplicate initialization from multiple script tags or rerenders
  if (window.__CAUSAL_TRACKER_INITIALIZED__) {
    return;
  }

  // Prevent tracker execution inside heatmap preview iframes to prevent data pollution
  try {
    if (
      window.location.search.includes('cf_preview=1') ||
      window.name === 'cf_heatmap_preview' ||
      window.__CF_PREVIEW_MODE__
    ) {
      return;
    }
  } catch (e) {}

  window.__CAUSAL_TRACKER_INITIALIZED__ = true;

  const STORAGE_KEY = 'cf_session_id';
  const LAST_ACTIVE_KEY = 'cf_session_last_active';
  const SESSION_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity timeout

  let lastTrackedPathAndQuery = null;
  let isInitialPageViewSent = false;
  let lastClickTime = 0;
  let lastClickX = -1;
  let lastClickY = -1;

  /**
   * Detect if an element or any of its ancestors is positioned fixed or sticky.
   * If fixed/sticky, computes its natural unrolled document Y position on the full-page layout.
   */
  function getElementPositioning(el) {
    if (!el || el.nodeType !== 1) return { isFixed: false, position: 'static', fixedContainer: null };
    try {
      let curr = el;
      while (curr && curr !== document.body && curr !== document.documentElement) {
        if (curr.nodeType === 1) {
          const style = window.getComputedStyle(curr);
          const pos = style ? style.position : '';
          if (pos === 'fixed' || pos === 'sticky') {
            return { isFixed: true, position: pos, fixedContainer: curr };
          }
        }
        curr = curr.parentElement;
      }
    } catch (e) {}
    return { isFixed: false, position: 'static', fixedContainer: null };
  }

  /**
   * Determine API base URL from script tag attributes, window config, or fallback default.
   */
  function resolveApiUrl() {
    if (window.__ANALYTICS_CONFIG__ && window.__ANALYTICS_CONFIG__.apiUrl) {
      return window.__ANALYTICS_CONFIG__.apiUrl.replace(/\/+$/, '');
    }

    const currentScript = document.currentScript || document.querySelector('script[src*="tracker.js"]');
    if (currentScript) {
      const dataUrl = currentScript.getAttribute('data-api-url');
      if (dataUrl) {
        return dataUrl.replace(/\/+$/, '');
      }
    }

    return 'http://localhost:5000/api';
  }

  /**
   * Determine Site ID for multi-website analytics.
   */
  function resolveSiteId() {
    if (window.__ANALYTICS_CONFIG__ && window.__ANALYTICS_CONFIG__.siteId) {
      return String(window.__ANALYTICS_CONFIG__.siteId).trim().toLowerCase();
    }

    const currentScript = document.currentScript || document.querySelector('script[src*="tracker.js"]');
    if (currentScript) {
      const dataSiteId = currentScript.getAttribute('data-site-id');
      if (dataSiteId) {
        return String(dataSiteId).trim().toLowerCase();
      }
    }

    return 'cf_demo_site';
  }

  let API_BASE_URL = resolveApiUrl();
  let CURRENT_SITE_ID = resolveSiteId();

  /**
   * Retrieve existing session ID from localStorage or generate a persistent new ID.
   * Enforces 30-minute inactivity expiry policy.
   * Format: session_<random_alphanumeric>_<timestamp>
   */
  function getOrCreateSessionId() {
    try {
      const now = Date.now();
      let sessionId = localStorage.getItem(STORAGE_KEY);
      const lastActiveStr = localStorage.getItem(LAST_ACTIVE_KEY);
      const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : 0;

      const isExpired = !lastActive || (now - lastActive > SESSION_INACTIVITY_TIMEOUT_MS);

      if (!sessionId || typeof sessionId !== 'string' || !sessionId.startsWith('session_') || isExpired) {
        const randomPart = Math.random().toString(36).substring(2, 10);
        const timePart = now.toString(36);
        sessionId = `session_${randomPart}_${timePart}`;
        localStorage.setItem(STORAGE_KEY, sessionId);
      }

      // Update activity timestamp
      localStorage.setItem(LAST_ACTIVE_KEY, String(now));
      return sessionId;
    } catch (e) {
      // Fallback for sandboxed iframes or private mode with disabled localStorage
      return `session_fallback_${Date.now()}`;
    }
  }

  /**
   * Synchronously capture viewport dimensions and full document scroll dimensions.
   */
  function captureDimensions() {
    const doc = document.documentElement;
    const body = document.body;
    return {
      viewport: {
        width: window.innerWidth || (doc && doc.clientWidth) || 1280,
        height: window.innerHeight || (doc && doc.clientHeight) || 800,
      },
      doc_width: Math.max(
        (body && body.scrollWidth) || 0,
        (body && body.offsetWidth) || 0,
        (doc && doc.scrollWidth) || 0,
        (doc && doc.clientWidth) || 0,
        (doc && doc.offsetWidth) || 0
      ) || (window.innerWidth || 1280),
      doc_height: Math.max(
        (body && body.scrollHeight) || 0,
        (body && body.offsetHeight) || 0,
        (doc && doc.scrollHeight) || 0,
        (doc && doc.clientHeight) || 0,
        (doc && doc.offsetHeight) || 0
      ) || (window.innerHeight || 800),
    };
  }

  /**
   * Normalize page URL: preserves pathname and query parameters, strips hash fragment,
   * and normalizes trailing slashes.
   */
  function cleanPageUrl(url) {
    try {
      const parsed = new URL(url || window.location.href, window.location.origin);
      parsed.hash = '';
      if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
        parsed.pathname = parsed.pathname.slice(0, -1);
      }
      return parsed.toString();
    } catch {
      return String(url || window.location.href).split('#')[0].replace(/\/+$/, '');
    }
  }

  /**
   * Extract pathname + search query string to distinguish genuine route changes
   * from in-page anchor jumps (e.g. #features, #pricing).
   */
  function getRoutePathAndQuery(url) {
    try {
      const parsed = new URL(url || window.location.href, window.location.origin);
      let path = parsed.pathname;
      if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
      }
      return path + parsed.search;
    } catch {
      return String(url || window.location.href).split('#')[0].replace(/\/+$/, '');
    }
  }

  /**
   * Dispatch analytics event payload to backend API asynchronously.
   * Uses keepalive for reliable unload delivery and handles network failures gracefully.
   */
  async function dispatchPayload(payload) {
    try {
      const endpoint = `${API_BASE_URL}/events`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true,
      });

      if (!response.ok) {
        console.warn(`[CausalTracker] Event dispatch responded HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn('[CausalTracker] Network error sending event:', error.message);
    }
  }

  /**
   * Determine whether the URL is part of the tracked ApexCloud demo website.
   * Excludes the analytics dashboard itself (/, /sessions, /heatmap).
   */
  function isTrackableUrl(url) {
    try {
      const parsed = new URL(url || window.location.href, window.location.origin);
      if (parsed.origin === window.location.origin) {
        return parsed.pathname === '/demo' || parsed.pathname.startsWith('/demo');
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Trigger a page_view event.
   * Records exactly one event on initial load and subsequent genuine navigations.
   * In-page anchor jumps (e.g. #features, #pricing) are explicitly ignored.
   */
  function trackPageView(overrideUrl = null) {
    const rawUrl = overrideUrl || window.location.href;
    const currentUrl = cleanPageUrl(rawUrl);
    const routeIdentifier = getRoutePathAndQuery(rawUrl);

    if (!isTrackableUrl(currentUrl)) {
      return;
    }

    // Do not generate a new page view when a navbar anchor only scrolls to a section (hash change)
    // or when the exact same page route is triggered repeatedly in rapid succession
    if (routeIdentifier === lastTrackedPathAndQuery && isInitialPageViewSent) {
      return;
    }

    lastTrackedPathAndQuery = routeIdentifier;
    isInitialPageViewSent = true;

    const dims = captureDimensions();
    const payload = {
      site_id: CURRENT_SITE_ID,
      session_id: getOrCreateSessionId(),
      event_type: 'page_view',
      page_url: currentUrl,
      timestamp: new Date().toISOString(),
      coordinates: null,
      viewport: dims.viewport,
      doc_width: dims.doc_width,
      doc_height: dims.doc_height,
    };

    // Dispatch network request
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => dispatchPayload(payload));
    } else {
      setTimeout(() => dispatchPayload(payload), 0);
    }
  }

  /**
   * Global click event listener.
   * Captures document coordinates (pageX, pageY), viewport coordinates (clientX, clientY),
   * scroll offsets, element identity, and layout dimensions SYNCHRONOUSLY at event occurrence time.
   */
  function handleDocumentClick(event) {
    if (!isTrackableUrl(window.location.href)) {
      return;
    }

    // Only capture primary mouse click (left click)
    if (event.button !== 0 && event.which !== 1 && event.button !== undefined) {
      return;
    }

    // Capture synchronous scroll offsets at the precise click moment
    const scrollX = window.scrollX !== undefined
      ? window.scrollX
      : (window.pageXOffset || (document.documentElement && document.documentElement.scrollLeft) || (document.body && document.body.scrollLeft) || 0);

    const scrollY = window.scrollY !== undefined
      ? window.scrollY
      : (window.pageYOffset || (document.documentElement && document.documentElement.scrollTop) || (document.body && document.body.scrollTop) || 0);

    // Viewport-relative coordinates
    const clientX = event.clientX !== undefined ? event.clientX : 0;
    const clientY = event.clientY !== undefined ? event.clientY : 0;

    // Document-relative coordinates: canonical coordinates for full-page heatmap
    const pageX = event.pageX !== undefined ? event.pageX : (clientX + scrollX);
    const pageY = event.pageY !== undefined ? event.pageY : (clientY + scrollY);

    // Identify the interactive element (button, link, input) even if clicked nested icon or span
    const targetNode = event.target;
    const interactiveEl = targetNode && typeof targetNode.closest === 'function'
      ? targetNode.closest('a, button, [role="button"], input, select, textarea, [tabindex]') || targetNode
      : targetNode;

    // Detect if clicked element is inside a sticky or fixed container (e.g. sticky navbar)
    const posInfo = getElementPositioning(interactiveEl);
    let canonicalX = pageX;
    let canonicalY = pageY;

    if (posInfo.isFixed) {
      // In an unrolled full-page heatmap, sticky elements live at the top / their natural in-document offset.
      // If the sticky header is stuck at the viewport top during scroll, its document Y on the unrolled page is clientY.
      const containerRect = posInfo.fixedContainer ? posInfo.fixedContainer.getBoundingClientRect() : null;
      if (containerRect && containerRect.top <= 20 && scrollY > 0) {
        canonicalY = Math.max(0, clientY);
      } else if (posInfo.position === 'fixed') {
        canonicalY = Math.max(0, clientY);
      }
    }

    const clickX = Number(Number(canonicalX).toFixed(2));
    const clickY = Number(Number(canonicalY).toFixed(2));

    // Debounce duplicate DOM event bubbling within 50ms at exact same coordinate
    const now = Date.now();
    if (now - lastClickTime < 50 && clickX === lastClickX && clickY === lastClickY) {
      return;
    }
    lastClickTime = now;
    lastClickX = clickX;
    lastClickY = clickY;

    let elementInfo = null;
    if (interactiveEl && interactiveEl.nodeType === 1) {
      const rect = typeof interactiveEl.getBoundingClientRect === 'function'
        ? interactiveEl.getBoundingClientRect()
        : null;

      const accessibleLabel =
        interactiveEl.getAttribute('aria-label') ||
        interactiveEl.getAttribute('title') ||
        (interactiveEl.innerText ? interactiveEl.innerText.slice(0, 80).trim() : '') ||
        interactiveEl.getAttribute('placeholder') ||
        '';

      elementInfo = {
        tag: interactiveEl.tagName ? interactiveEl.tagName.toLowerCase() : '',
        id: interactiveEl.id || '',
        classes: typeof interactiveEl.className === 'string' ? interactiveEl.className.slice(0, 150).trim() : '',
        text: accessibleLabel,
        role: interactiveEl.getAttribute('role') || '',
        href: interactiveEl.getAttribute('href') || '',
        rect: rect ? {
          top: Math.round(rect.top + (posInfo.isFixed ? 0 : scrollY)),
          left: Math.round(rect.left + (posInfo.isFixed ? 0 : scrollX)),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        } : null,
      };
    }

    // Synchronously capture full layout dimensions and URL before any layout shift
    const dims = captureDimensions();
    const currentUrl = cleanPageUrl(window.location.href);
    const sessionId = getOrCreateSessionId();
    const timestamp = new Date().toISOString();

    const payload = {
      site_id: CURRENT_SITE_ID,
      session_id: sessionId,
      event_type: 'click',
      page_url: currentUrl,
      timestamp: timestamp,
      coordinates: {
        x: clickX,
        y: clickY,
        client_x: Number(Number(clientX).toFixed(2)),
        client_y: Number(Number(clientY).toFixed(2)),
      },
      scroll_x: Number(Number(scrollX).toFixed(2)),
      scroll_y: Number(Number(scrollY).toFixed(2)),
      is_fixed: posInfo.isFixed,
      viewport: dims.viewport,
      doc_width: dims.doc_width,
      doc_height: dims.doc_height,
      element: elementInfo,
    };

    // Defer network transmission only to avoid blocking UI click handlers
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => dispatchPayload(payload));
    } else {
      setTimeout(() => dispatchPayload(payload), 0);
    }
  }

  /**
   * Initialize event listeners once DOM is accessible.
   */
  function initTracker() {
    // 1. Register global click listener (capturing phase for complete coverage)
    document.addEventListener('click', handleDocumentClick, true);

    // 2. Initial page view
    if (!isInitialPageViewSent) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => trackPageView(), { once: true });
      } else {
        trackPageView();
      }
    }

    // 3. SPA Navigation Support: Hook history methods
    const originalPushState = window.history.pushState;
    if (originalPushState) {
      window.history.pushState = function () {
        originalPushState.apply(this, arguments);
        setTimeout(() => trackPageView(), 0);
      };
    }

    const originalReplaceState = window.history.replaceState;
    if (originalReplaceState) {
      window.history.replaceState = function () {
        originalReplaceState.apply(this, arguments);
        setTimeout(() => trackPageView(), 0);
      };
    }

    // 4. Browser Back/Forward navigation (popstate)
    window.addEventListener('popstate', () => {
      setTimeout(() => trackPageView(), 0);
    });
  }

  // Self-initialize
  initTracker();

  // Expose public API for programmatic usage or external sites
  window.CausalTracker = {
    version: '1.3.0',
    getSessionId: getOrCreateSessionId,
    getSiteId: () => CURRENT_SITE_ID,
    setSiteId: (siteId) => {
      CURRENT_SITE_ID = String(siteId).trim().toLowerCase();
    },
    getApiUrl: () => API_BASE_URL,
    setApiUrl: (url) => {
      API_BASE_URL = url.replace(/\/+$/, '');
    },
    trackPageView,
    trackClick: (pageX, pageY, clientX = null, clientY = null, element = null, isFixed = false) => {
      const scrollX = window.scrollX || window.pageXOffset || 0;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const dims = captureDimensions();
      const payload = {
        site_id: CURRENT_SITE_ID,
        session_id: getOrCreateSessionId(),
        event_type: 'click',
        page_url: cleanPageUrl(window.location.href),
        timestamp: new Date().toISOString(),
        coordinates: {
          x: Number(Number(pageX).toFixed(2)),
          y: Number(Number(pageY).toFixed(2)),
          client_x: clientX != null ? Number(Number(clientX).toFixed(2)) : Number(Number(pageX - scrollX).toFixed(2)),
          client_y: clientY != null ? Number(Number(clientY).toFixed(2)) : Number(Number(pageY - scrollY).toFixed(2)),
        },
        scroll_x: Number(Number(scrollX).toFixed(2)),
        scroll_y: Number(Number(scrollY).toFixed(2)),
        is_fixed: Boolean(isFixed),
        viewport: dims.viewport,
        doc_width: dims.doc_width,
        doc_height: dims.doc_height,
        element: element || null,
      };
      dispatchPayload(payload);
    },
    getDocDimensions: captureDimensions,
    resetSession: () => {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LAST_ACTIVE_KEY);
      lastTrackedPathAndQuery = null;
      isInitialPageViewSent = false;
      return getOrCreateSessionId();
    },
  };
})(window, document);
