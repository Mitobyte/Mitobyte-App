/**
 * RSVP API Service
 * Connects React frontend to Cloudflare Pages Functions API for RSVPs
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Create or update RSVP
 * @param {Object} rsvpData - { eventId, walletAddress, rsvpStatus }
 * @returns {Promise<Object>} RSVP response
 */
export async function saveRsvp({ eventId, walletAddress, rsvpStatus }) {
  const response = await fetch(`${API_BASE_URL}/api/rsvps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ eventId, walletAddress, rsvpStatus }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save RSVP');
  }

  return response.json();
}

/**
 * Get user's RSVP for a specific event
 * @param {number} eventId
 * @param {string} walletAddress
 * @returns {Promise<Object>} RSVP data
 */
export async function getUserRsvp(eventId, walletAddress) {
  const params = new URLSearchParams({ eventId, walletAddress });
  const response = await fetch(`${API_BASE_URL}/api/rsvps?${params}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch RSVP');
  }

  return response.json();
}

/**
 * Get all RSVPs for a user
 * @param {string} walletAddress
 * @returns {Promise<Object>} User's RSVPs
 */
export async function getUserRsvps(walletAddress) {
  const params = new URLSearchParams({ walletAddress });
  const response = await fetch(`${API_BASE_URL}/api/rsvps?${params}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch RSVPs');
  }

  return response.json();
}

/**
 * Delete/remove user's RSVP for an event
 * @param {number} eventId
 * @param {string} walletAddress
 * @returns {Promise<Object>} Delete response
 */
export async function deleteRsvp(eventId, walletAddress) {
  const params = new URLSearchParams({ eventId, walletAddress });
  const response = await fetch(`${API_BASE_URL}/api/rsvps?${params}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete RSVP');
  }

  return response.json();
}

/**
 * Get event RSVP statistics
 * @param {number} eventId
 * @returns {Promise<Object>} Event stats
 */
export async function getEventStats(eventId) {
  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/stats`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch event stats');
  }

  return response.json();
}

/**
 * Get public list of attendees for an event
 * @param {number} eventId 
 * @returns {Promise<Object>} List of attendees
 */
export async function getEventAttendees(eventId) {
  const params = new URLSearchParams({ eventId });
  const response = await fetch(`${API_BASE_URL}/api/rsvps?${params}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch attendees');
  }

  return response.json();
}
