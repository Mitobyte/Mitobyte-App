/**
 * Utility functions for QR code check-in system
 */

/**
 * Generate a unique check-in code for an event
 * Format: EVT-{eventId}-{randomString}
 */
export function generateCheckInCode(eventId) {
  const randomPart = Math.random().toString(36).substring(2, 15) +
                     Math.random().toString(36).substring(2, 15);
  return `EVT-${eventId}-${randomPart}`;
}

/**
 * Validate check-in code format
 */
export function isValidCheckInCode(code) {
  return /^EVT-\d+-[a-z0-9]+$/.test(code);
}

/**
 * Extract event ID from check-in code
 */
export function extractEventIdFromCode(code) {
  const match = code.match(/^EVT-(\d+)-/);
  return match ? parseInt(match[1]) : null;
}
