/**
 * Responsive Design Utilities
 * Centralized breakpoints and responsive helper functions
 */

// Tailwind default breakpoints (matching tailwind.config.js)
export const BREAKPOINTS = {
  sm: 640,   // Small devices (landscape phones)
  md: 768,   // Medium devices (tablets)
  lg: 1024,  // Large devices (desktops)
  xl: 1280,  // Extra large devices
  '2xl': 1536 // 2X Extra large devices
};

/**
 * Get current breakpoint based on window width
 */
export function getCurrentBreakpoint() {
  if (typeof window === 'undefined') return 'xl';

  const width = window.innerWidth;

  if (width < BREAKPOINTS.sm) return 'xs';
  if (width < BREAKPOINTS.md) return 'sm';
  if (width < BREAKPOINTS.lg) return 'md';
  if (width < BREAKPOINTS.xl) return 'lg';
  if (width < BREAKPOINTS['2xl']) return 'xl';
  return '2xl';
}

/**
 * Check if viewport is at or above a breakpoint
 */
export function isBreakpoint(breakpoint) {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= BREAKPOINTS[breakpoint];
}

/**
 * Check if device is mobile (< md breakpoint)
 */
export function isMobile() {
  return !isBreakpoint('md');
}

/**
 * Check if device is tablet (md to lg)
 */
export function isTablet() {
  return isBreakpoint('md') && !isBreakpoint('lg');
}

/**
 * Check if device is desktop (>= lg)
 */
export function isDesktop() {
  return isBreakpoint('lg');
}

/**
 * Responsive class builder
 * Usage: responsive({ base: 'text-sm', sm: 'text-base', lg: 'text-lg' })
 * Returns: 'text-sm sm:text-base lg:text-lg'
 */
export function responsive(classes) {
  const breakpointOrder = ['base', 'sm', 'md', 'lg', 'xl', '2xl'];

  return breakpointOrder
    .filter(bp => classes[bp])
    .map(bp => bp === 'base' ? classes[bp] : `${bp}:${classes[bp]}`)
    .join(' ');
}

/**
 * Container max-width utilities
 */
export const CONTAINER_WIDTHS = {
  sm: 'max-w-screen-sm',   // 640px
  md: 'max-w-screen-md',   // 768px
  lg: 'max-w-screen-lg',   // 1024px
  xl: 'max-w-screen-xl',   // 1280px
  '2xl': 'max-w-screen-2xl', // 1536px
  '3xl': 'max-w-7xl',      // 80rem / 1280px
  '4xl': 'max-w-[90rem]',  // 1440px
  full: 'max-w-full'
};

/**
 * Spacing scale for consistent padding/margin
 */
export const SPACING = {
  xs: 'p-2 sm:p-3',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
  xl: 'p-8 sm:p-12',
  '2xl': 'p-12 sm:p-16'
};

/**
 * Text size scale
 */
export const TEXT_SIZES = {
  xs: 'text-xs sm:text-sm',
  sm: 'text-sm sm:text-base',
  base: 'text-base sm:text-lg',
  lg: 'text-lg sm:text-xl',
  xl: 'text-xl sm:text-2xl',
  '2xl': 'text-2xl sm:text-3xl',
  '3xl': 'text-3xl sm:text-4xl',
  '4xl': 'text-4xl sm:text-5xl'
};

/**
 * Modal/Dialog inset patterns
 */
export const MODAL_INSETS = {
  full: 'inset-0',                                // Full screen
  comfortable: 'inset-4 sm:inset-8 md:inset-16',  // Comfortable padding
  centered: 'inset-4 sm:inset-8 md:inset-16 lg:inset-24', // Centered with max padding
  mobile: 'inset-0 sm:inset-8 md:inset-16'        // Full on mobile, padded on larger
};

/**
 * Grid column patterns
 */
export const GRID_COLS = {
  '1': 'grid-cols-1',
  '2': 'grid-cols-1 sm:grid-cols-2',
  '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  '2-3': 'grid-cols-2 lg:grid-cols-3',
  '3-4': 'grid-cols-3 lg:grid-cols-4'
};

/**
 * Hook for responsive values (React)
 * Usage in component:
 * const padding = useResponsive({ base: '1rem', md: '2rem', lg: '3rem' })
 */
export function useResponsive(values) {
  if (typeof window === 'undefined') return values.base;

  const breakpoint = getCurrentBreakpoint();
  const breakpointOrder = ['base', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);

  // Find the closest defined value at or below current breakpoint
  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }

  return values.base;
}

export default {
  BREAKPOINTS,
  CONTAINER_WIDTHS,
  SPACING,
  TEXT_SIZES,
  MODAL_INSETS,
  GRID_COLS,
  getCurrentBreakpoint,
  isBreakpoint,
  isMobile,
  isTablet,
  isDesktop,
  responsive,
  useResponsive
};
