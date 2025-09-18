import { useEffect, useRef, RefObject } from 'react';

/**
 * Custom hook for handling click outside events
 * 
 * @param callback - Function to call when clicked outside
 * @param enabled - Whether the listener is enabled (default: true)
 * @returns RefObject to attach to the target element
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  callback: () => void,
  enabled: boolean = true
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    if (enabled) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [callback, enabled]);

  return ref;
}
