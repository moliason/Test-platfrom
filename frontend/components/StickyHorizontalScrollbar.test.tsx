/* @vitest-environment happy-dom */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StickyHorizontalScrollbar from './StickyHorizontalScrollbar';

(globalThis as typeof globalThis & { React: typeof React }).React = React;
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('StickyHorizontalScrollbar', () => {
  let host: HTMLDivElement | null = null;
  let target: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  afterEach(async () => {
    if (root) {
      await act(async () => root?.unmount());
    }
    host?.remove();
    target?.remove();
    root = null;
    host = null;
    target = null;
    vi.restoreAllMocks();
  });

  it('pins the scrollbar to the viewport while matching the target panel width', async () => {
    host = document.createElement('div');
    target = document.createElement('div');
    document.body.append(host, target);

    Object.defineProperties(target, {
      clientWidth: { configurable: true, value: 400 },
      scrollWidth: { configurable: true, value: 900 },
    });
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      bottom: 350,
      height: 150,
      left: 120,
      right: 520,
      top: 200,
      width: 400,
    } as DOMRect);

    root = createRoot(host);
    await act(async () => {
      root?.render(<StickyHorizontalScrollbar targetRef={{ current: target }} />);
    });

    const scrollbar = document.querySelector('[aria-label="Horizontal table scrollbar"]') as HTMLDivElement;
    expect(scrollbar.className).toContain('fixed');
    expect(scrollbar.style.left).toBe('120px');
    expect(scrollbar.style.width).toBe('400px');
    expect(scrollbar.style.bottom).toBe('0px');
  });
});
