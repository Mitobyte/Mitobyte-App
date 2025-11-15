/**
 * Authentication Service
 * Handles JWT token management and authentication API calls
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Token storage keys
const ACCESS_TOKEN_KEY = 'mitobyte_access_token';
const REFRESH_TOKEN_KEY = 'mitobyte_refresh_token';
const USER_DATA_KEY = 'mitobyte_user';

/**
 * Store authentication tokens
 * @param {string} accessToken - JWT access token
 * @param {string} refreshToken - JWT refresh token
 * @param {Object} user - User data
 */
export function storeTokens(accessToken, refreshToken, user) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
}

/**
 * Get stored access token
 * @returns {string|null} Access token or null
 */
export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Get stored refresh token
 * @returns {string|null} Refresh token or null
 */
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Get stored user data
 * @returns {Object|null} User data or null
 */
export function getStoredUser() {
  const userData = localStorage.getItem(USER_DATA_KEY);
  return userData ? JSON.parse(userData) : null;
}

/**
 * Clear all stored authentication data
 */
export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY);
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!getAccessToken();
}

/**
 * Register a new user
 * @param {Object} userData - { walletAddress, email?, displayName? }
 * @returns {Promise<Object>} Authentication response
 */
export async function register(userData) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }

  const data = await response.json();

  // Store tokens and user data
  if (data.accessToken && data.refreshToken) {
    storeTokens(data.accessToken, data.refreshToken, data.user);
  }

  return data;
}

/**
 * Login user with wallet address or email
 * @param {Object} credentials - { walletAddress } or { email }
 * @returns {Promise<Object>} Authentication response
 */
export async function login(credentials) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const data = await response.json();

  // Store tokens and user data
  if (data.accessToken && data.refreshToken) {
    storeTokens(data.accessToken, data.refreshToken, data.user);
  }

  return data;
}

/**
 * Logout user
 */
export function logout() {
  clearTokens();
}

/**
 * Refresh access token using refresh token
 * @returns {Promise<string>} New access token
 */
export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearTokens(); // Clear invalid tokens
    throw new Error('Token refresh failed');
  }

  const data = await response.json();

  // Update access token
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);

  return data.accessToken;
}

/**
 * Verify current token and get user data
 * @returns {Promise<Object>} User data
 */
export async function verifyToken() {
  const token = getAccessToken();

  if (!token) {
    throw new Error('No token available');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Token verification failed');
  }

  const data = await response.json();

  // Update stored user data
  if (data.user) {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
  }

  return data;
}

/**
 * Make authenticated API request
 * Automatically handles token refresh on 401 errors
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function authenticatedFetch(url, options = {}) {
  let token = getAccessToken();

  if (!token) {
    throw new Error('No authentication token');
  }

  // Add Authorization header
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  let response = await fetch(url, { ...options, headers });

  // If 401, try to refresh token and retry
  if (response.status === 401) {
    try {
      token = await refreshAccessToken();

      // Retry with new token
      headers.Authorization = `Bearer ${token}`;
      response = await fetch(url, { ...options, headers });
    } catch (refreshError) {
      // Refresh failed - logout user
      logout();
      throw new Error('Session expired. Please login again.');
    }
  }

  return response;
}

/**
 * Get Authorization header for API requests
 * @returns {Object} Headers object with Authorization
 */
export function getAuthHeaders() {
  const token = getAccessToken();

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}
