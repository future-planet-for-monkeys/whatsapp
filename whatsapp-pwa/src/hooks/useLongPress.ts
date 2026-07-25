import { useCallback, useRef } from 'react';

interface UseLongPressOptions {
  threshold?: number;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export function useLongPress(
  callback: (e: React.MouseEvent | React.TouchEvent) => void,
  { threshold = 500, onContextMenu }: UseLongPressOptions = {}
) {
  const timerRef = useRef<any>(null);
  const isLongPressActive = useRef(false);
  const startCoords = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Only trigger for primary click (left click) or touch
      if ('button' in e && e.button !== 0) return;

      isLongPressActive.current = false;

      // Record starting coordinates to detect movement/scrolling
      if ('touches' in e && e.touches[0]) {
        startCoords.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      } else if ('clientX' in e) {
        startCoords.current = {
          x: e.clientX,
          y: e.clientY,
        };
      }

      timerRef.current = setTimeout(() => {
        isLongPressActive.current = true;
        callback(e);
      }, threshold);
    },
    [callback, threshold]
  );

  const cancel = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // If it was a long press, prevent default click behavior
      if (isLongPressActive.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    []
  );

  const handleMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!startCoords.current) return;

      let currentX = 0;
      let currentY = 0;

      if ('touches' in e && e.touches[0]) {
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        currentX = e.clientX;
        currentY = e.clientY;
      }

      // If moved more than 10px, cancel the long press (user is scrolling or dragging)
      const diffX = Math.abs(currentX - startCoords.current.x);
      const diffY = Math.abs(currentY - startCoords.current.y);

      if (diffX > 10 || diffY > 10) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
    },
    []
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (onContextMenu) {
        onContextMenu(e);
      } else {
        callback(e);
      }
    },
    [callback, onContextMenu]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isLongPressActive.current) {
        e.preventDefault();
        e.stopPropagation();
        isLongPressActive.current = false;
      }
    },
    []
  );

  return {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onMouseMove: handleMove,
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: handleMove,
    onContextMenu: handleContextMenu,
    onClick: handleClick,
  };
}
