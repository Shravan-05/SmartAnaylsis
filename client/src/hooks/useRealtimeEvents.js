import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

/**
 * Format relative time from a timestamp (e.g. "just now", "8s ago", "2m ago")
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return 'Never';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 1000));
  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${Math.floor(diffHour / 24)}d ago`;
}

export function useRealtimeEvents(siteId = 'cf_demo_site', onEventReceived = null, onResetReceived = null) {
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'live' | 'connecting' | 'offline'
  const [liveEvents, setLiveEvents] = useState([]);
  const [lastEventTime, setLastEventTime] = useState(null);
  const [ticker, setTicker] = useState(0);

  const eventSourceRef = useRef(null);
  const onEventRef = useRef(onEventReceived);
  const onResetRef = useRef(onResetReceived);

  useEffect(() => {
    onEventRef.current = onEventReceived;
  }, [onEventReceived]);

  useEffect(() => {
    onResetRef.current = onResetReceived;
  }, [onResetReceived]);

  // Periodic 1-second ticker to re-render relative times
  useEffect(() => {
    const timer = setInterval(() => setTicker((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Hydrate initial real events
  const loadInitialEvents = useCallback(async () => {
    try {
      const initial = await api.getRecentEvents(siteId, 15);
      if (Array.isArray(initial)) {
        setLiveEvents(initial);
        if (initial.length > 0 && initial[0].timestamp) {
          setLastEventTime(initial[0].timestamp);
        }
      }
    } catch {
      // Non-critical hydration failure
    }
  }, [siteId]);

  useEffect(() => {
    loadInitialEvents();
  }, [loadInitialEvents]);

  // Setup Server-Sent Events stream
  useEffect(() => {
    let reconnectTimeout = null;
    let isMounted = true;

    function connectSSE() {
      if (!isMounted) return;
      setConnectionStatus('connecting');

      const sseUrl = api.getLiveStreamUrl(siteId);
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.addEventListener('open', () => {
        if (isMounted) setConnectionStatus('live');
      });

      es.addEventListener('connected', () => {
        if (isMounted) setConnectionStatus('live');
      });

      es.addEventListener('new_event', (e) => {
        if (!isMounted) return;
        try {
          const newDoc = JSON.parse(e.data);
          setLastEventTime(newDoc.timestamp);
          setLiveEvents((prev) => {
            // Deduplicate by id / session + timestamp
            const id = newDoc.id || newDoc._id;
            if (id && prev.some((item) => (item.id || item._id) === id)) {
              return prev;
            }
            return [newDoc, ...prev.slice(0, 19)];
          });

          if (onEventRef.current) {
            onEventRef.current(newDoc);
          }
        } catch {
          // Ignore invalid parse
        }
      });

      es.addEventListener('reset', (e) => {
        if (!isMounted) return;
        setLiveEvents([]);
        setLastEventTime(null);
        if (onResetRef.current) {
          onResetRef.current();
        }
      });

      es.onerror = () => {
        if (!isMounted) return;
        setConnectionStatus('offline');
        es.close();

        // Attempt reconnection after 3 seconds
        reconnectTimeout = setTimeout(() => {
          if (isMounted) connectSSE();
        }, 3000);
      };
    }

    connectSSE();

    return () => {
      isMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [siteId]);

  return {
    connectionStatus,
    liveEvents,
    lastEventTime,
    lastEventRelative: formatRelativeTime(lastEventTime),
    refreshLiveFeed: loadInitialEvents,
  };
}

export default useRealtimeEvents;
