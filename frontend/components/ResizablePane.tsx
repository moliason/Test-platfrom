'use client';
import { useState, useRef, useEffect, ReactNode } from 'react';

type Props = {
  leftPane: ReactNode;
  rightPane: ReactNode;
  minLeftWidth?: number;
  minRightWidth?: number;
  defaultLeftWidth?: number;
  stickyRightPane?: boolean;
  stackOnMobile?: boolean;
};

export default function ResizablePanes({
  leftPane,
  rightPane,
  minLeftWidth = 40,
  minRightWidth = 15,
  defaultLeftWidth = 70,
  stickyRightPane = false,
  stackOnMobile = false,
}: Props) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth); // default 70%
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Clamp the width between min and max
      const maxLeftWidth = 100 - minRightWidth;
      const clampedWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, newLeftWidth));

      setLeftWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minLeftWidth, minRightWidth]);

  return (
    <div
      ref={containerRef}
      className={`${stickyRightPane ? 'flex min-h-[calc(100dvh-4rem)] items-start' : 'flex h-[calc(100dvh-4rem-1px)]'} ${stackOnMobile ? 'max-md:flex-col' : ''}`}
      style={{ userSelect: isDragging ? 'none' : 'auto' }}
    >
      <div
        className={`border-r-1 dark:border-neutral-700 overflow-auto ${stickyRightPane ? 'h-[calc(100dvh-4rem)]' : ''} ${stackOnMobile ? 'max-md:!w-full max-md:h-[35%] max-md:shrink-0 max-md:border-b' : ''}`}
        style={{ width: `${leftWidth}%`, minWidth: `${minLeftWidth}%` }}
      >
        {leftPane}
      </div>

      <div
        className={`w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary transition-colors ${stackOnMobile ? 'max-md:hidden' : ''}`}
        role="separator"
        onMouseDown={handleMouseDown}
        style={{ flexShrink: 0 }}
      />

      <div
        className={`flex-1 overflow-auto ${stickyRightPane ? 'sticky top-0 h-[calc(100dvh-4rem)]' : ''} ${stackOnMobile ? 'min-h-0 max-md:!min-w-0' : ''}`}
        style={{ minWidth: `${minRightWidth}%` }}
      >
        {rightPane}
      </div>
    </div>
  );
}
