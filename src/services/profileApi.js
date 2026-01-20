/**
 * Profile API Service
 * Connects React frontend to Cloudflare Pages Functions profile API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Get user profile by wallet address
 * @param {string} walletAddress
 * @returns {Promise<Object>} Profile data or null
 */
export async function getProfile(walletAddress) {
  const response = await fetch(
    `${API_BASE_URL}/api/profile?walletAddress=${encodeURIComponent(walletAddress)}`
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null; // Profile doesn't exist
    }
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch profile');
  }

  const result = await response.json();
  return result.profile;
}

/**
 * Create or update user profile
 * @param {string} walletAddress
 * @param {Object} profileData - Profile fields to update
 * @param {boolean} markComplete - Whether to mark profile as complete
 * @returns {Promise<Object>} Update result
 */
export async function updateProfile(walletAddress, profileData, markComplete = false) {
  const response = await fetch(`${API_BASE_URL}/api/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      walletAddress,
      ...profileData,
      markComplete
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update profile');
  }

  return response.json();
}

/**
 * Check if user has completed their profile
 * @param {string} walletAddress
 * @returns {Promise<boolean>} True if profile is complete
 */
export async function isProfileComplete(walletAddress) {
  try {
    const profile = await getProfile(walletAddress);
    if (!profile) return false; // No profile = incomplete
    return profile.profile_completed === 1;
  } catch (error) {
    console.error('Failed to check profile completion:', error);
    return false;
  }
}

/**
 * Mark profile as complete
 * @param {string} walletAddress
 * @returns {Promise<Object>} Update result
 */
export async function markProfileComplete(walletAddress) {
  return updateProfile(walletAddress, {}, true);
}

/**
 * Validate required profile fields for completion
 * @param {Object} profile - Profile object
 * @returns {Object} { isValid: boolean, missingFields: string[] }
 */
export function validateProfileCompletion(profile) {
  const requiredFields = [
    'name',
    'username',
    'tagline',
    'bio',
    'location',
    'skills',
    'interests'
  ];

  const missingFields = requiredFields.filter(field => {
    const value = profile?.[field];
    if (!value) return true;

    // For JSON arrays (skills, interests), check if they have at least one item
    if (field === 'skills' || field === 'interests') {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        return !Array.isArray(parsed) || parsed.length === 0;
      } catch {
        return true;
      }
    }

    return false;
  });

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Update profile visibility (public/private)
 * @param {string} walletAddress
 * @param {string} visibility - 'public' or 'private'
 * @returns {Promise<Object>} Update result
 */
export async function updateProfileVisibility(walletAddress, visibility) {
  const response = await fetch(`${API_BASE_URL}/api/profile-visibility`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      walletAddress,
      visibility
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update profile visibility');
  }

  return response.json();
}

/**
 * Delete user account (soft delete)
 * @param {string} walletAddress
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteAccount(walletAddress) {
  const response = await fetch(`${API_BASE_URL}/api/user-delete`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      walletAddress
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete account');
  }

  return response.json();
}
