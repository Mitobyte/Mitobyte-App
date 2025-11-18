/**
 * Admin API Service
 * Connects React frontend to admin API endpoints
 */

import { getAuthHeaders } from './authService.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Get all users (admin only)
 * @returns {Promise<Object>} Users list with statistics
 */
export async function getAllUsers() {
  const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch users');
  }

  return response.json();
}

/**
 * Promote a user to admin status
 * @param {number} userId - ID of user to promote
 * @returns {Promise<Object>} Updated user data
 */
export async function promoteUserToAdmin(userId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/promote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to promote user');
  }

  return response.json();
}

/**
 * Demote a user from admin status
 * @param {number} userId - ID of user to demote
 * @returns {Promise<Object>} Updated user data
 */
export async function demoteUserFromAdmin(userId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/demote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to demote user');
  }

  return response.json();
}

/**
 * Promote a user to host status
 * @param {number} userId - ID of user to promote
 * @returns {Promise<Object>} Updated user data
 */
export async function promoteUserToHost(userId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/promote-host`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to promote user to host');
  }

  return response.json();
}

/**
 * Demote a user from host status
 * @param {number} userId - ID of user to demote
 * @returns {Promise<Object>} Updated user data
 */
export async function demoteUserFromHost(userId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/demote-host`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to demote user from host');
  }

  return response.json();
}

/**
 * Delete a user and all associated data
 * @param {number} userId - ID of user to delete
 * @returns {Promise<Object>} Success response
 */
export async function deleteUser(userId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete user');
  }

  return response.json();
}

/**
 * Suspend a user account
 * @param {number} userId - ID of user to suspend
 * @param {string} reason - Reason for suspension (optional)
 * @returns {Promise<Object>} Updated user data
 */
export async function suspendUser(userId, reason = '') {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/suspend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to suspend user');
  }

  return response.json();
}

/**
 * Unsuspend a user account
 * @param {number} userId - ID of user to unsuspend
 * @returns {Promise<Object>} Updated user data
 */
export async function unsuspendUser(userId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/unsuspend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to unsuspend user');
  }

  return response.json();
}

/**
 * Promote a user to sponsor status
 * @param {number} userId - ID of user to promote
 * @returns {Promise<Object>} Updated user data
 */
export async function promoteUserToSponsor(userId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/promote-sponsor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to promote user to sponsor');
  }

  return response.json();
}

/**
 * Demote a user from sponsor status
 * @param {number} userId - ID of user to demote
 * @returns {Promise<Object>} Updated user data
 */
export async function demoteUserFromSponsor(userId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/demote-sponsor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to demote user from sponsor');
  }

  return response.json();
}
