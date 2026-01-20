/**
 * Replyke API Service
 * Handles registration and token management for Replyke social features
 */

/**
 * Register user with Replyke and get JWT token
 * @param {string} walletAddress - User's wallet address or email identifier
 * @returns {Promise<Object>} Replyke registration data with JWT token
 */
export async function registerWithReplyke(walletAddress) {
  try {
    const response = await fetch(
      `/api/user/replyke-token?walletAddress=${encodeURIComponent(walletAddress)}`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to register with Replyke');
    }

    return {
      token: data.token,
      projectId: data.projectId,
      user: data.user,
      expiresIn: data.expiresIn
    };
  } catch (error) {
    console.error('Replyke registration error:', error);
    // Don't throw - we want the app to work even if Replyke fails
    return null;
  }
}

/**
 * Store Replyke token in localStorage for persistence
 * @param {string} token - JWT token from Replyke
 * @param {string} walletAddress - User's wallet address
 */
export function storeReplykeToken(token, walletAddress) {
  try {
    localStorage.setItem(`replyke_token_${walletAddress}`, token);
    localStorage.setItem('replyke_token_expires_at', Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days
  } catch (error) {
    console.error('Failed to store Replyke token:', error);
  }
}

/**
 * Get stored Replyke token from localStorage
 * @param {string} walletAddress - User's wallet address
 * @returns {string|null} JWT token or null if not found/expired
 */
export function getStoredReplykeToken(walletAddress) {
  try {
    const token = localStorage.getItem(`replyke_token_${walletAddress}`);
    const expiresAt = localStorage.getItem('replyke_token_expires_at');

    if (!token || !expiresAt) {
      return null;
    }

    // Check if token is expired
    if (Date.now() > parseInt(expiresAt)) {
      // Token expired, clear it
      clearReplykeToken(walletAddress);
      return null;
    }

    return token;
  } catch (error) {
    console.error('Failed to get Replyke token:', error);
    return null;
  }
}

/**
 * Clear stored Replyke token
 * @param {string} walletAddress - User's wallet address
 */
export function clearReplykeToken(walletAddress) {
  try {
    localStorage.removeItem(`replyke_token_${walletAddress}`);
    localStorage.removeItem('replyke_token_expires_at');
  } catch (error) {
    console.error('Failed to clear Replyke token:', error);
  }
}
