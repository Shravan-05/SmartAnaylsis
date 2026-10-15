import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ||
    (typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1')
    ? 'https://smartanaylsis.onrender.com/api'
    : 'http://localhost:5000/api');

/**
 * Backend connection lifecycle states:
 *   'connecting' — initial or retrying after a gap
 *   'online'     — /api/health responded healthy
 *   'offline'    — all retries exhausted with no success
 */

// Separate axios instance for health checks ONLY.
// Uses a long timeout to accommodate Render free-tier cold starts (~50s).
// Does NOT share the retry interceptor used by regular analytics requests.
const healthClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 55000, // 55 seconds — covers a full Render cold start
  headers: { 'Content-Type': 'application/json' },
});

const RETRY_DELAYS_MS = [0, 8000, 15000]; // attempt 1 immediately, then 8s, then 15s
const POLL_INTERVAL_MS = 30000;           // re-ping every 30s once online

async function attemptHealthCheck() {
  const res = await healthClient.get('/health');
  return res.data?.status === 'healthy';
}

export function useBackendHealth() {
  // 'connecting' | 'online' | 'offline'
  const [backendStatus, setBackendStatus] = useState('connecting');
  const isMountedRef = useRef(true);
  const pollTimerRef = useRef(null);
  const retryTimerRef = useRef(null);

  const clearTimers = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
  };

  /**
   * Run the full retry strategy for an initial/recovery health check.
   * Tries RETRY_DELAYS_MS.length times before declaring OFFLINE.
   */
  const runHealthProbe = useCallback(async () => {
    if (!isMountedRef.current) return;

    setBackendStatus('connecting');

    for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
      if (!isMountedRef.current) return;

      if (RETRY_DELAYS_MS[attempt] > 0) {
        // Wait before this retry
        await new Promise((resolve) => {
          retryTimerRef.current = setTimeout(resolve, RETRY_DELAYS_MS[attempt]);
        });
      }

      if (!isMountedRef.current) return;

      try {
        const healthy = await attemptHealthCheck();
        if (!isMountedRef.current) return;
        if (healthy) {
          setBackendStatus('online');
          // Start periodic polling to detect if backend goes down later
          clearTimers();
          pollTimerRef.current = setInterval(async () => {
            if (!isMountedRef.current) return;
            try {
              const stillHealthy = await attemptHealthCheck();
              if (!isMountedRef.current) return;
              if (!stillHealthy) {
                clearTimers();
                runHealthProbe();
              }
            } catch {
              if (!isMountedRef.current) return;
              clearTimers();
              runHealthProbe();
            }
          }, POLL_INTERVAL_MS);
          return; // success — stop retry loop
        }
      } catch {
        console.warn(`[BackendHealth] Attempt ${attempt + 1} failed.`);
      }
    }

    // All retries exhausted
    if (isMountedRef.current) {
      setBackendStatus('offline');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    isMountedRef.current = true;
    runHealthProbe();

    return () => {
      isMountedRef.current = false;
      clearTimers();
    };
  }, [runHealthProbe]);

  /** Manual retry — called by the Retry button */
  const retryConnection = useCallback(() => {
    clearTimers();
    runHealthProbe();
  }, [runHealthProbe]);

  return { backendStatus, retryConnection };
}

export default useBackendHealth;
