/**
 * Utility to clear localStorage for demo mode
 */

export function clearDemoStorage() {
  try {
    // Clear kiosk-related localStorage items
    localStorage.removeItem('pavilion:lastKioskId');
    console.log('🎭 Demo mode: cleared localStorage');
  } catch (error) {
    console.warn('Failed to clear demo storage:', error);
  }
}

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  
  const isOnPavilionPage = window.location.pathname === '/pavilion';
  const urlParams = new URLSearchParams(window.location.search);
  const urlKioskId = urlParams.get('kioskId');
  
  return isOnPavilionPage && !urlKioskId;
}
