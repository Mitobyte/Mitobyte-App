/**
 * User API Service
 * Connects React frontend to Cloudflare Pages Functions API
 */

// Pages Functions run on same origin, no separate API URL needed
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Create a new user
 * @param {Object} userData - { walletAddress, email?, displayName? }
 * @returns {Promise<Object>} Created user
 */
export async function createUser({ walletAddress, email, displayName }) {
  const response = await fetch(`${API_BASE_URL}/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ walletAddress, email, displayName }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create user');
  }

  return response.json();
}

/**
 * Get user by wallet address
 * @param {string} walletAddress
 * @returns {Promise<Object>} User data
 */
export async function getUserByWallet(walletAddress) {
  const response = await fetch(
    `${API_BASE_URL}/api/users/${encodeURIComponent(walletAddress)}`
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null; // User doesn't exist
    }
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch user');
  }

  return response.json();
}

/**
 * Update user profile
 * @param {string} walletAddress
 * @param {Object} updates - { email?, displayName? }
 * @returns {Promise<Object>} Update result
 */
export async function updateUser(walletAddress, updates) {
  const response = await fetch(
    `${API_BASE_URL}/api/users/${encodeURIComponent(walletAddress)}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update user');
  }

  return response.json();
}

/**
 * Delete user
 * @param {string} walletAddress
 * @returns {Promise<Object>} Delete result
 */
export async function deleteUser(walletAddress) {
  const response = await fetch(
    `${API_BASE_URL}/api/users/${encodeURIComponent(walletAddress)}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete user');
  }

  return response.json();
}

/**
 * Get or create user (idempotent)
 * @param {Object} userData - { walletAddress, email?, displayName? }
 * @returns {Promise<Object>} User data
 */
export async function getOrCreateUser({ walletAddress, email, displayName }) {
  // Try to get existing user
  const existingUser = await getUserByWallet(walletAddress);

  if (existingUser) {
    return existingUser;
  }

  // Create new user if doesn't exist
  return createUser({ walletAddress, email, displayName });
}
