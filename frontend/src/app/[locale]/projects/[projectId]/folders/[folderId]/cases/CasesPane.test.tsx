/* @vitest-environment happy-dom */
import React, { act, useContext, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CaseTreeProvider, { CaseTreeContext } from '../../CaseTreeProvider';

(globalThis as typeof globalThis & { React: typeof React }).React = React;
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { query } = vi.hoisted(() => ({ query: { current: '' } }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(query.current) }));
vi.mock('@/config/config', () => ({ default: { apiServer: '/api' } }));
vi.mock('@/utils/errorHandler', () => ({ logError: vi.fn() }));
vi.mock('@/utils/TokenProvider', async () => {
  const ReactModule = await import('react');
  return { TokenContext: ReactModule.createContext({ token: { access_token: 'token' } }) };
});

const messages = { selected: 'Selected', noCasesFound: 'Empty', loadError: 'Error', retry: 'Retry' };
let treeState: React.ContextType<typeof CaseTreeContext>;
function Probe() {
  treeState = useContext(CaseTreeContext);
  const { loadCases, entries } = treeState!;
  useEffect(() => {
    void loadCases(20);
  }, [loadCases]);
  return <div>{entries[20]?.error ? 'Error' : entries[20]?.cases?.map((item) => item.title).join('|')}</div>;
}

afterEach(() => {
  vi.unstubAllGlobals();
  query.current = '';
});

describe('Shared case tree loading', () => {
  it('deduplicates requests and retains cases when switching details', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: 72, title: 'Case 72' }] });
    vi.stubGlobal('fetch', fetchMock);
    const container = document.createElement('div');
    const root = createRoot(container);
    const render = () =>
      root.render(
        <CaseTreeProvider messages={messages}>
          <Probe />
          <Probe />
        </CaseTreeProvider>
      );
    await act(async () => render());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Case 72');
    await act(async () => render());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => root.unmount());
  });

  it('keeps a slow previous filter response out of the current tree', async () => {
    let resolveOld: (value: unknown) => void = () => {};
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve;
          })
      )
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 2, title: 'Filtered case' }] });
    vi.stubGlobal('fetch', fetchMock);
    const container = document.createElement('div');
    const root = createRoot(container);
    const render = () =>
      root.render(
        <CaseTreeProvider messages={messages}>
          <Probe />
        </CaseTreeProvider>
      );
    await act(async () => render());
    query.current = 'search=Filtered';
    await act(async () => render());
    expect(container.textContent).toBe('Filtered case');
    await act(async () => resolveOld({ ok: true, json: async () => [{ id: 1, title: 'Old case' }] }));
    expect(container.textContent).toBe('Filtered case');
    await act(async () => root.unmount());
  });

  it('refreshes edited cases and does not cache failed requests as empty folders', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 72, title: 'Case 72' }] })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 72, title: 'Renamed case' }] });
    vi.stubGlobal('fetch', fetchMock);
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () =>
      root.render(
        <CaseTreeProvider messages={messages}>
          <Probe />
        </CaseTreeProvider>
      )
    );
    expect(container.textContent).toBe('Error');
    await act(async () => {
      await treeState!.loadCases(20, true);
    });
    expect(container.textContent).toBe('Case 72');
    await act(async () => {
      await treeState!.refreshCases();
    });
    expect(container.textContent).toBe('Renamed case');
    await act(async () => root.unmount());
  });
});
