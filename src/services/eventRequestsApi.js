/**
 * Event Requests API Service
 * Admin functions for managing user-submitted event requests
 */

import { getAuthHeaders } from './authService.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Get all event requests
 * @param {Object} options - { status?: 'pending'|'approved'|'rejected'|'all' }
 * @returns {Promise<Object>} Event requests list
 */
export async function getAllEventRequests(options = {}) {
  const params = new URLSearchParams();

  if (options.status && options.status !== 'all') {
    params.append('status', options.status);
  }

  const queryString = params.toString();
  const url = `${API_BASE_URL}/api/event-requests${queryString ? '?' + queryString : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch event requests');
  }

  return response.json();
}

/**
 * Approve an event request (creates the event)
 * @param {number} requestId - ID of the request to approve
 * @param {Object} eventData - Optional modifications to event data before approval
 * @returns {Promise<Object>} Created event and updated request
 */
export async function approveEventRequest(requestId, eventData = {}) {
  const response = await fetch(`${API_BASE_URL}/api/event-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      action: 'approve',
      requestId,
      ...eventData
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to approve event request');
  }

  return response.json();
}

/**
 * Reject an event request
 * @param {number} requestId - ID of the request to reject
 * @param {string} reason - Reason for rejection
 * @returns {Promise<Object>} Updated request
 */
export async function rejectEventRequest(requestId, reason = '') {
  const response = await fetch(`${API_BASE_URL}/api/event-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      action: 'reject',
      requestId,
      rejectionReason: reason
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to reject event request');
  }

  return response.json();
}

/**
 * Delete an event request
 * @param {number} requestId - ID of the request to delete
 * @returns {Promise<Object>} Success response
 */
export async function deleteEventRequest(requestId) {
  // For now, we don't have a delete action in the API, so we'll reject it instead
  // You could add a delete action to the API if needed
  return rejectEventRequest(requestId, 'Deleted by admin');
}
