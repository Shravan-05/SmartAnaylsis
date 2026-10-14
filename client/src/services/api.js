import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
    ? 'https://smartanaylsis.onrender.com/api'
    : 'http://localhost:5000/api');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Controlled retry interceptor for Render cold starts (idempotent GET queries only)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    config.__retryCount = config.__retryCount || 0;
    const maxRetries = 2;

    const isTimeoutOrNetwork =
      error.code === 'ECONNABORTED' ||
      error.message?.includes('timeout') ||
      !error.response ||
      error.response.status === 503 ||
      error.response.status === 504;

    const isIdempotent = !config.method || config.method.toLowerCase() === 'get';

    if (isTimeoutOrNetwork && isIdempotent && config.__retryCount < maxRetries) {
      config.__retryCount += 1;
      const backoffDelay = config.__retryCount * 2000;
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      return apiClient(config);
    }

    return Promise.reject(error);
  }
);

export const APEX_SITE_ID = 'cf_demo_site';

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export function getClientTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export const api = {
  // Backend & DB Health
  async getHealth() {
    const res = await apiClient.get('/health');
    return res.data;
  },

  // Websites management (preserved for API compatibility)
  async getSites() {
    const res = await apiClient.get('/sites');
    return res.data?.data || [];
  },

  async createSite(siteData) {
    const res = await apiClient.post('/sites', siteData);
    return res.data;
  },

  async getSiteById(siteId) {
    const res = await apiClient.get(`/sites/${encodeURIComponent(siteId)}`);
    return res.data?.data;
  },

  // Overview Stats (filtered by site_id, time_range, custom dates, grouping, and browser timezone)
  async getStats(siteId = APEX_SITE_ID, timeRange = 'all', startDate = null, endDate = null, groupBy = null, timezone = null) {
    const userTimezone = timezone || getClientTimezone();

    const params = {
      site_id: siteId && siteId !== 'all' ? siteId : APEX_SITE_ID,
      timezone: userTimezone,
    };
    if (timeRange && timeRange !== 'all') params.time_range = timeRange;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (groupBy) params.group_by = groupBy;

    const res = await apiClient.get('/events/stats', { params });
    return res.data?.data;
  },

  // Recent real events for live feed panel hydration
  async getRecentEvents(siteId = APEX_SITE_ID, limit = 15) {
    const params = {
      site_id: siteId && siteId !== 'all' ? siteId : APEX_SITE_ID,
      limit,
    };
    const res = await apiClient.get('/events/recent', { params });
    return res.data?.data || [];
  },

  // Server-Sent Events stream URL
  getLiveStreamUrl(siteId = APEX_SITE_ID) {
    const targetSiteId = siteId && siteId !== 'all' ? siteId : APEX_SITE_ID;
    return `${API_BASE_URL}/events/live?site_id=${encodeURIComponent(targetSiteId)}`;
  },

  // Sessions list with pagination, search, site_id, and date filters
  async getSessions(params = {}) {
    const cleanParams = {
      page: 1,
      limit: 10,
      search: '',
      site_id: APEX_SITE_ID,
      timezone: getClientTimezone(),
      ...params,
    };
    if (!cleanParams.site_id || cleanParams.site_id === 'all') {
      cleanParams.site_id = APEX_SITE_ID;
    }
    const res = await apiClient.get('/sessions', { params: cleanParams });
    return res.data;
  },

  // Chronological events for a specific session with date filter and timezone
  async getSessionEvents(sessionId, siteId = APEX_SITE_ID, timeRange = null, startDate = null, endDate = null, timezone = null) {
    const params = {
      site_id: siteId && siteId !== 'all' ? siteId : APEX_SITE_ID,
      timezone: timezone || getClientTimezone(),
    };
    if (timeRange && timeRange !== 'all') params.time_range = timeRange;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const res = await apiClient.get(`/sessions/${encodeURIComponent(sessionId)}/events`, { params });
    return res.data;
  },

  // Heatmap distinct pages (filtered by site_id, date range, and timezone)
  async getHeatmapPages(siteId = APEX_SITE_ID, timeRange = null, startDate = null, endDate = null, timezone = null) {
    const params = {
      site_id: siteId && siteId !== 'all' ? siteId : APEX_SITE_ID,
      timezone: timezone || getClientTimezone(),
    };
    if (timeRange && timeRange !== 'all') params.time_range = timeRange;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const res = await apiClient.get('/heatmap/pages', { params });
    return res.data?.data || [];
  },

  // Heatmap click coordinates for a given page, site_id, date range, and timezone
  async getHeatmapData(url, siteId = APEX_SITE_ID, timeRange = null, startDate = null, endDate = null, timezone = null, sessionId = null) {
    const params = {
      url,
      site_id: siteId && siteId !== 'all' ? siteId : APEX_SITE_ID,
      timezone: timezone || getClientTimezone(),
    };
    if (timeRange && timeRange !== 'all') params.time_range = timeRange;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (sessionId) params.session_id = sessionId;

    const res = await apiClient.get('/heatmap', { params });
    return res.data;
  },

  // Seed simulator data (tagged with site_id)
  async seedDemoData(sessionCount = 6, siteId = APEX_SITE_ID) {
    const res = await apiClient.post('/seed', { sessionCount, site_id: siteId });
    return res.data;
  },

  // Clear demo data (strictly scoped to target site_id)
  async clearDemoData(siteId = APEX_SITE_ID) {
    const params = { site_id: siteId && siteId !== 'all' ? siteId : APEX_SITE_ID };
    const res = await apiClient.delete('/seed', { params });
    return res.data;
  },

  // Direct manual event tracking
  async trackEvent(eventData) {
    const res = await apiClient.post('/events', eventData);
    return res.data;
  },
};

export default api;
