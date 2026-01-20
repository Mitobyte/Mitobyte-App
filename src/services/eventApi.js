/**
 * Event API Service
 * Connects React frontend to Cloudflare Pages Functions API for events
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Create a new event
 * @param {Object} eventData - { title, description, eventType, date, time, location, capacity?, createdBy?, isRecurring?, recurringPattern?, recurringEndDate? }
 * @returns {Promise<Object>} Created event
 */
export async function createEvent(eventData) {
  const response = await fetch(`${API_BASE_URL}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create event');
  }

  return response.json();
}

/**
 * Get all events
 * @param {Object} options - { type?, upcoming? }
 * @returns {Promise<Object>} Events list
 */
export async function getAllEvents(options = {}) {
  const params = new URLSearchParams();

  if (options.type) {
    params.append('type', options.type);
  }

  if (options.upcoming) {
    params.append('upcoming', 'true');
  }

  const queryString = params.toString();
  const url = `${API_BASE_URL}/api/events${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch events');
  }

  return response.json();
}

/**
 * Get upcoming events (convenience function)
 * @returns {Promise<Object>} Upcoming events list
 */
export async function getUpcomingEvents() {
  return getAllEvents({ upcoming: true });
}

/**
 * Get events by type
 * @param {string} eventType - 'code_and_coffee', 'code_and_brews', or 'hackathon'
 * @returns {Promise<Object>} Filtered events list
 */
export async function getEventsByType(eventType) {
  return getAllEvents({ type: eventType });
}

/**
 * Update an event
 * @param {number} eventId - ID of the event to update
 * @param {Object} eventData - Updated event data
 * @param {boolean} updateSeries - Whether to update all events in series (optional)
 * @returns {Promise<Object>} Updated event
 */
export async function updateEvent(eventId, eventData, updateSeries = false) {
  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...eventData, updateSeries }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update event');
  }

  return response.json();
}

/**
 * Delete an event
 * @param {number} eventId - ID of the event to delete
 * @param {boolean} deleteSeries - Whether to delete all events in series (optional)
 * @returns {Promise<Object>} Success response
 */
export async function deleteEvent(eventId, deleteSeries = false) {
  const url = deleteSeries
    ? `${API_BASE_URL}/api/events/${eventId}?delete_series=true`
    : `${API_BASE_URL}/api/events/${eventId}`;

  const response = await fetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete event');
  }

  return response.json();
}
