
/**
 * Triggers a haptic feedback vibration.
 * Uses navigator.vibrate which works on Android WebViews and most mobile browsers.
 */
export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') => {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;

  switch (type) {
    case 'light':
      navigator.vibrate(10); // Subtle click
      break;
    case 'medium':
      navigator.vibrate(20); // Standard button press
      break;
    case 'heavy':
      navigator.vibrate(40); // Important action
      break;
    case 'success':
      navigator.vibrate([10, 50, 20]); // Da-da pattern
      break;
    case 'error':
      navigator.vibrate([50, 30, 50]); // Buzz-buzz
      break;
  }
};
