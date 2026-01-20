/**
 * Centralized Z-Index System
 * Ensures proper layering across the entire application
 */

export const Z_INDEX = {
  // Base layers (0-9)
  BASE: 0,

  // Content layers (10-19)
  DROPDOWN: 10,
  STICKY_HEADER: 15,

  // Navigation layers (20-29)
  BOTTOM_NAV: 20,
  SUB_NAV: 25,

  // Overlay layers (30-39)
  OVERLAY: 30,
  SIDEBAR: 35,

  // Modal layers (40-49)
  MODAL_BACKDROP: 40,
  MODAL: 45,

  // Pop-up layers (50-59)
  POPOVER: 50,
  TOOLTIP: 55,

  // Critical UI layers (60-69)
  NOTIFICATION: 60,
  TOAST: 65,

  // Absolute top (70+)
  QR_SCANNER: 70,
  LOADING_SCREEN: 75,
  ERROR_BOUNDARY: 80
};

// Helper function to get z-index with offset
export function getZIndex(layer, offset = 0) {
  return Z_INDEX[layer] + offset;
}

// Tailwind class generator for z-index
export function zIndexClass(layer, offset = 0) {
  const value = getZIndex(layer, offset);
  return `z-[${value}]`;
}

export default Z_INDEX;
