'use client';

import { RefObject, useEffect, useRef, useState } from 'react';

type Props = {
  targetRef: RefObject<HTMLElement | null>;
};

export default function StickyHorizontalScrollbar({ targetRef }: Props) {
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({
    contentWidth: 1,
    viewportWidth: 0,
    left: 0,
    width: 0,
    visible: false,
  });

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const updateLayout = () => {
      const rect = target.getBoundingClientRect();
      const left = Math.max(0, rect.left);
      const right = Math.min(window.innerWidth, rect.right);
      const width = Math.max(0, right - left);
      const nextLayout = {
        contentWidth: target.scrollWidth,
        viewportWidth: target.clientWidth,
        left,
        width,
        visible: rect.bottom > 0 && rect.top < window.innerHeight && width > 0,
      };

      setLayout((current) =>
        current.contentWidth === nextLayout.contentWidth &&
        current.viewportWidth === nextLayout.viewportWidth &&
        current.left === nextLayout.left &&
        current.width === nextLayout.width &&
        current.visible === nextLayout.visible
          ? current
          : nextLayout
      );
    };
    const syncFromTarget = () => {
      const scrollbar = scrollbarRef.current;
      if (!scrollbar) return;
      if (scrollbar.scrollLeft !== target.scrollLeft) {
        scrollbar.scrollLeft = target.scrollLeft;
      }
    };

    updateLayout();
    const firstFrame = window.requestAnimationFrame
      ? window.requestAnimationFrame(updateLayout)
      : window.setTimeout(updateLayout, 0);
    const secondFrame = window.requestAnimationFrame
      ? window.requestAnimationFrame(() => window.requestAnimationFrame(updateLayout))
      : window.setTimeout(updateLayout, 16);
    const delayedMeasurement = window.setTimeout(updateLayout, 100);
    target.addEventListener('scroll', syncFromTarget, { passive: true });
    window.addEventListener('resize', updateLayout);
    document.addEventListener('scroll', updateLayout, true);

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateLayout);
    resizeObserver?.observe(target);
    Array.from(target.children).forEach((child) => resizeObserver?.observe(child));

    const mutationObserver =
      typeof MutationObserver === 'undefined' ? null : new MutationObserver(updateLayout);
    mutationObserver?.observe(target, { childList: true, subtree: true });
    const measurementInterval = window.setInterval(updateLayout, 250);

    return () => {
      if (window.cancelAnimationFrame) {
        window.cancelAnimationFrame(firstFrame);
        window.cancelAnimationFrame(secondFrame);
      } else {
        window.clearTimeout(firstFrame);
        window.clearTimeout(secondFrame);
      }
      window.clearTimeout(delayedMeasurement);
      window.clearInterval(measurementInterval);
      target.removeEventListener('scroll', syncFromTarget);
      window.removeEventListener('resize', updateLayout);
      document.removeEventListener('scroll', updateLayout, true);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [targetRef]);

  if (layout.contentWidth <= layout.viewportWidth || !layout.visible || layout.width <= 0) return null;

  return (
    <div
      ref={scrollbarRef}
      className="fixed bottom-0 z-50 overflow-x-auto bg-background/95 py-1"
      style={{ left: `${layout.left}px`, width: `${layout.width}px`, bottom: 0 }}
      onScroll={() => {
        const target = targetRef.current;
        const scrollbar = scrollbarRef.current;
        if (target && scrollbar && target.scrollLeft !== scrollbar.scrollLeft) {
          target.scrollLeft = scrollbar.scrollLeft;
        }
      }}
      aria-label="Horizontal table scrollbar"
    >
      <div style={{ width: `${layout.contentWidth}px`, height: 1 }} />
    </div>
  );
}
