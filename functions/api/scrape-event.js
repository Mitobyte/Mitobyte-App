/**
 * Cloudflare Pages Function: /api/scrape-event
 * Scrapes event information from external URLs (Eventbrite, Meetup, etc.)
 * Extracts JSON-LD Schema.org Event data and Open Graph tags
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/**
 * Extract JSON-LD structured data from HTML
 */
function extractJsonLd(html) {
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const matches = [...html.matchAll(jsonLdRegex)];

  for (const match of matches) {
    try {
      const data = JSON.parse(match[1]);

      // Handle both single Event and array of items
      if (data['@type'] === 'Event') {
        return data;
      }

      // Check if it's an array or graph
      if (Array.isArray(data)) {
        const event = data.find(item => item['@type'] === 'Event');
        if (event) return event;
      }

      if (data['@graph']) {
        const event = data['@graph'].find(item => item['@type'] === 'Event');
        if (event) return event;
      }
    } catch (e) {
      // Invalid JSON, continue to next match
      continue;
    }
  }

  return null;
}

/**
 * Extract Open Graph meta tags from HTML
 */
function extractOpenGraph(html) {
  const ogData = {};

  const metaRegex = /<meta[^>]*property=["'](og:[^"']+)["'][^>]*content=["']([^"']+)["'][^>]*>/gi;
  const matches = [...html.matchAll(metaRegex)];

  for (const match of matches) {
    const property = match[1].replace('og:', '');
    ogData[property] = match[2];
  }

  return ogData;
}

/**
 * Extract basic meta tags as additional fallback
 */
function extractBasicMeta(html) {
  const meta = {};

  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) meta.title = titleMatch[1];

  // Description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (descMatch) meta.description = descMatch[1];

  return meta;
}

/**
 * Parse location data from various formats
 */
function parseLocation(locationData) {
  if (!locationData) return null;

  // String format
  if (typeof locationData === 'string') {
    return locationData;
  }

  // Schema.org Place object
  if (locationData['@type'] === 'Place') {
    const address = locationData.address;
    if (typeof address === 'string') return address;

    if (address && address['@type'] === 'PostalAddress') {
      // Build address from components
      const parts = [
        address.streetAddress,
        address.addressLocality,
        address.addressRegion,
        address.postalCode,
        address.addressCountry
      ].filter(Boolean);

      return parts.join(', ');
    }

    return locationData.name || null;
  }

  // VirtualLocation
  if (locationData['@type'] === 'VirtualLocation') {
    return 'Virtual Event';
  }

  return null;
}

/**
 * Parse date/time to ISO format
 */
function parseDateTime(dateStr) {
  if (!dateStr) return null;

  try {
    const date = new Date(dateStr);
    return date.toISOString();
  } catch (e) {
    return null;
  }
}

/**
 * Normalize event data from JSON-LD
 */
function normalizeFromJsonLd(jsonLd) {
  const normalized = {};

  // Basic info
  normalized.title = jsonLd.name || null;
  normalized.description = jsonLd.description || null;

  // Date and time
  if (jsonLd.startDate) {
    const startDateTime = parseDateTime(jsonLd.startDate);
    if (startDateTime) {
      const date = new Date(startDateTime);
      normalized.date = date.toISOString().split('T')[0]; // YYYY-MM-DD
      normalized.time = date.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
    }
  }

  // Location
  normalized.location = parseLocation(jsonLd.location);

  // Image/Thumbnail
  if (jsonLd.image) {
    if (typeof jsonLd.image === 'string') {
      normalized.thumbnailUrl = jsonLd.image;
    } else if (Array.isArray(jsonLd.image)) {
      normalized.thumbnailUrl = jsonLd.image[0];
    } else if (jsonLd.image.url) {
      normalized.thumbnailUrl = jsonLd.image.url;
    }
  }

  // Event type detection
  normalized.eventType = 'meetup'; // Default

  const titleLower = (normalized.title || '').toLowerCase();
  const descLower = (normalized.description || '').toLowerCase();

  if (titleLower.includes('hackathon') || descLower.includes('hackathon')) {
    normalized.eventType = 'hackathon';
  } else if (titleLower.includes('workshop') || descLower.includes('workshop')) {
    normalized.eventType = 'workshop';
  } else if (titleLower.includes('coffee') && titleLower.includes('code')) {
    normalized.eventType = 'code_and_coffee';
  } else if (titleLower.includes('brews') && titleLower.includes('code')) {
    normalized.eventType = 'code_and_brews';
  }

  // Organizer
  if (jsonLd.organizer) {
    if (typeof jsonLd.organizer === 'string') {
      normalized.organizer = jsonLd.organizer;
    } else if (jsonLd.organizer.name) {
      normalized.organizer = jsonLd.organizer.name;
    }
  }

  return normalized;
}

/**
 * Normalize event data from Open Graph tags
 */
function normalizeFromOpenGraph(ogData) {
  const normalized = {};

  normalized.title = ogData.title || null;
  normalized.description = ogData.description || null;
  normalized.thumbnailUrl = ogData.image || null;

  // Open Graph doesn't have standardized event fields
  // but we can extract what's available
  if (ogData.url) {
    normalized.sourceUrl = ogData.url;
  }

  return normalized;
}

/**
 * GET /api/scrape-event - API info
 */
export async function onRequestGet() {
  return jsonResponse({
    endpoint: '/api/scrape-event',
    method: 'POST',
    description: 'Scrape event data from external URLs (Eventbrite, Meetup, Facebook Events, etc.)',
    usage: {
      body: {
        url: 'https://eventbrite.com/event/...'
      }
    }
  });
}

/**
 * POST /api/scrape-event - Scrape event data from URL
 */
export async function onRequestPost(context) {
  try {
    const { url } = await context.request.json();

    if (!url) {
      return jsonResponse({ error: 'URL is required' }, 400);
    }

    // Validate URL format
    let eventUrl;
    try {
      eventUrl = new URL(url);
    } catch (e) {
      return jsonResponse({ error: 'Invalid URL format' }, 400);
    }

    // Fetch the external page
    const response = await fetch(eventUrl.toString(), {
      headers: {
        'User-Agent': 'MitobyteBot/1.0 (+https://mitobyte.com)',
      },
    });

    if (!response.ok) {
      return jsonResponse({
        error: `Failed to fetch URL: ${response.status} ${response.statusText}`
      }, 400);
    }

    const html = await response.text();

    // Try to extract JSON-LD first (most reliable)
    const jsonLd = extractJsonLd(html);
    let eventData = {};

    if (jsonLd) {
      eventData = normalizeFromJsonLd(jsonLd);
      eventData.source = 'json-ld';
    } else {
      // Fallback to Open Graph tags
      const ogData = extractOpenGraph(html);
      if (ogData && ogData.title) {
        eventData = normalizeFromOpenGraph(ogData);
        eventData.source = 'open-graph';

        // Add basic meta as additional fallback
        const basicMeta = extractBasicMeta(html);
        if (!eventData.title) eventData.title = basicMeta.title;
        if (!eventData.description) eventData.description = basicMeta.description;
      } else {
        return jsonResponse({
          error: 'Could not extract event data from this URL. The page may not contain structured event information.',
          hint: 'Make sure the URL points to a valid event page on platforms like Eventbrite, Meetup, Facebook Events, or Eventbrite.'
        }, 400);
      }
    }

    // Always include the original URL
    eventData.externalUrl = url;

    // Platform detection
    const hostname = eventUrl.hostname.toLowerCase();
    if (hostname.includes('eventbrite')) {
      eventData.platform = 'Eventbrite';
    } else if (hostname.includes('meetup')) {
      eventData.platform = 'Meetup';
    } else if (hostname.includes('facebook')) {
      eventData.platform = 'Facebook Events';
    } else if (hostname.includes('eventbee')) {
      eventData.platform = 'Eventbee';
    } else if (hostname.includes('ticketmaster')) {
      eventData.platform = 'Ticketmaster';
    } else {
      eventData.platform = 'External';
    }

    return jsonResponse({
      success: true,
      data: eventData,
      message: `Successfully extracted event data from ${eventData.platform}`
    });

  } catch (error) {
    console.error('Scrape event error:', error);
    return jsonResponse({
      error: 'Failed to scrape event data',
      details: error.message
    }, 500);
  }
}

/**
 * OPTIONS /api/scrape-event - CORS preflight
 */
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
