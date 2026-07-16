import { useState, useEffect } from 'react';

/**
 * Debounce a value by a specified delay in milliseconds.
 * Returns the debounced value that updates only after the delay has elapsed
 * since the last change.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return (): void => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}