/**
 * Real-time Server-Sent Events (SSE) broadcaster for analytics ingestion.
 * Supports scoped site_id listeners, heartbeats, and zero-data reset broadcasts.
 */

class EventBroadcaster {
  constructor() {
    // Map client response objects to their registered site_id filter
    this.clients = new Map();

    // Heartbeat interval (15s) to keep SSE connections open through proxies
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, 15000);
  }

  /**
   * Register a new SSE client
   */
  register(req, res, siteId = 'cf_demo_site') {
    const targetSiteId = String(siteId).trim().toLowerCase();

    // Configure standard SSE response headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', site_id: targetSiteId, timestamp: new Date().toISOString() })}\n\n`);

    this.clients.set(res, targetSiteId);

    // Clean up when client disconnects
    req.on('close', () => {
      this.clients.delete(res);
    });
  }

  /**
   * Broadcast a newly ingested event to connected clients
   */
  broadcastEvent(eventDoc) {
    if (!eventDoc || this.clients.size === 0) return;

    const eventSiteId = String(eventDoc.site_id || 'cf_demo_site').trim().toLowerCase();
    const payload = JSON.stringify(eventDoc);

    for (const [res, clientSiteId] of this.clients.entries()) {
      if (clientSiteId === 'all' || clientSiteId === eventSiteId) {
        try {
          res.write(`event: new_event\ndata: ${payload}\n\n`);
        } catch {
          this.clients.delete(res);
        }
      }
    }
  }

  /**
   * Broadcast a reset event so all open tabs clear data instantly
   */
  broadcastReset(siteId = 'cf_demo_site') {
    const targetSiteId = String(siteId).trim().toLowerCase();
    const payload = JSON.stringify({ site_id: targetSiteId, timestamp: new Date().toISOString() });

    for (const [res, clientSiteId] of this.clients.entries()) {
      if (clientSiteId === 'all' || clientSiteId === targetSiteId) {
        try {
          res.write(`event: reset\ndata: ${payload}\n\n`);
        } catch {
          this.clients.delete(res);
        }
      }
    }
  }

  /**
   * Send SSE comment ping to prevent timeout
   */
  sendHeartbeat() {
    for (const [res] of this.clients.entries()) {
      try {
        res.write(': ping\n\n');
      } catch {
        this.clients.delete(res);
      }
    }
  }

  /**
   * Return number of active streaming clients
   */
  getActiveClientCount() {
    return this.clients.size;
  }
}

export const broadcaster = new EventBroadcaster();
export default broadcaster;
