/* @vitest-environment happy-dom */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import ResizablePanes from './ResizablePane';

(globalThis as typeof globalThis & { React: typeof React }).React = React;
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ResizablePanes viewport sizing', () => {
  it('keeps the default project panes inside the viewport', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<ResizablePanes leftPane={<div>Left</div>} rightPane={<div>Right</div>} />);
    });

    expect(container.firstElementChild?.className).toContain('h-[calc(100dvh-4rem-1px)]');
    expect(container.firstElementChild?.className).not.toContain('h-full');

    await act(async () => root.unmount());
  });
});
