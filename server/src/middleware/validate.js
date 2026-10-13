/**
 * Strict validation middleware for POST /api/events payloads.
 */
export function validateEvent(req, res, next) {
  const { site_id, session_id, event_type, page_url, timestamp, coordinates, viewport } = req.body || {};
  const errors = [];

  // 1. Validate site_id (optional, defaults to 'cf_demo_site')
  if (site_id !== undefined && site_id !== null) {
    if (typeof site_id !== 'string' || site_id.trim().length === 0) {
      errors.push('site_id must be a non-empty string');
    } else if (!/^[a-z0-9_-]{2,50}$/i.test(site_id.trim())) {
      errors.push('site_id contains invalid characters. Use letters, numbers, hyphens, and underscores (2-50 chars)');
    }
  }

  // 2. Validate session_id
  if (!session_id || typeof session_id !== 'string' || session_id.trim().length === 0) {
    errors.push('session_id is required and must be a non-empty string');
  }

  // 3. Validate event_type
  if (!event_type || !['page_view', 'click'].includes(event_type)) {
    errors.push('event_type is required and must be either "page_view" or "click"');
  }

  // 4. Validate page_url
  if (!page_url || typeof page_url !== 'string' || page_url.trim().length === 0) {
    errors.push('page_url is required and must be a valid non-empty string');
  } else {
    try {
      new URL(page_url);
    } catch {
      if (!page_url.startsWith('http://') && !page_url.startsWith('https://') && !page_url.startsWith('/')) {
        errors.push('page_url must be a valid absolute or relative URL string');
      }
    }
  }

  // 5. Validate timestamp
  if (!timestamp) {
    errors.push('timestamp is required');
  } else {
    const parsedDate = new Date(timestamp);
    if (isNaN(parsedDate.getTime())) {
      errors.push('timestamp must be a valid ISO-8601 date string or timestamp');
    }
  }

  // 6. Validate coordinates based on event_type
  if (event_type === 'click') {
    if (
      !coordinates ||
      typeof coordinates !== 'object' ||
      typeof coordinates.x !== 'number' ||
      typeof coordinates.y !== 'number' ||
      isNaN(coordinates.x) ||
      isNaN(coordinates.y) ||
      coordinates.x < 0 ||
      coordinates.y < 0
    ) {
      errors.push('coordinates { x: number, y: number } with non-negative numbers are required for click events');
    }
  } else if (event_type === 'page_view') {
    if (coordinates !== null && coordinates !== undefined) {
      errors.push('coordinates must be null or omitted for page_view events');
    }
  }

  // 7. Validate optional viewport
  if (viewport !== null && viewport !== undefined) {
    if (
      typeof viewport !== 'object' ||
      typeof viewport.width !== 'number' ||
      typeof viewport.height !== 'number' ||
      viewport.width < 0 ||
      viewport.height < 0
    ) {
      errors.push('viewport must be an object with positive numeric width and height');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Event validation failed',
      errors,
    });
  }

  next();
}
