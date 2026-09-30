/* @vitest-environment happy-dom */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import CasesWorkspace from './CasesWorkspace';
import type { CasesMessages } from '@/types/case';

(globalThis as typeof globalThis & { React: typeof React }).React = React;
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { selectedSegment, listLifecycle, replaceMock, treeState } = vi.hoisted(() => ({
  selectedSegment: { current: null as string | null },
  listLifecycle: { mounts: 0, unmounts: 0 },
  replaceMock: vi.fn(),
  treeState: { entries: { 2: { cases: [] as Array<{ id: number }> } }, loadCases: vi.fn(), messages: {} },
}));

vi.mock('next/navigation', () => ({
  useSelectedLayoutSegment: () => selectedSegment.current,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/src/i18n/routing', () => ({ useRouter: () => ({ replace: replaceMock }) }));
vi.mock('@heroui/react', () => ({ Button: () => null, Spinner: () => null }));
vi.mock('../../CaseTreeProvider', async () => {
  const ReactModule = await import('react');
  return { CaseTreeContext: ReactModule.createContext(treeState) };
});
vi.mock('./CasesPane', async () => {
  const ReactModule = await import('react');
  return {
    default: function MockCasesPane() {
      const [selected, setSelected] = ReactModule.useState(false);
      ReactModule.useEffect(() => {
        listLifecycle.mounts += 1;
        return () => {
          listLifecycle.unmounts += 1;
        };
      }, []);
      return ReactModule.createElement(
        'button',
        { className: 'stateful-list', onClick: () => setSelected(true) },
        selected ? 'Selected' : 'Not selected'
      );
    },
  };
});

const messages = {} as CasesMessages;

describe('CasesWorkspace persistent rendering', () => {
  it('keeps toolbar selection mounted while switching case details', async () => {
    selectedSegment.current = null;
    listLifecycle.mounts = 0;
    listLifecycle.unmounts = 0;
    const container = document.createElement('div');
    const root = createRoot(container);
    const renderWorkspace = () =>
      root.render(
        <CasesWorkspace
          projectId="1"
          folderId="2"
          messages={messages}
          runDialogMessages={{
            run: '',
            runName: '',
            runDescription: '',
            close: '',
            create: '',
            update: '',
            pleaseEnter: '',
          }}
          priorityMessages={{ critical: '', high: '', medium: '', low: '' }}
          testTypeMessages={{}}
          locale="zh-CN"
        >
          <div className="case-detail">Case detail</div>
        </CasesWorkspace>
      );

    await act(async () => renderWorkspace());
    const listButton = container.querySelector('.stateful-list') as HTMLButtonElement;
    await act(async () => listButton.click());
    expect(listButton.textContent).toBe('Selected');

    selectedSegment.current = '1532';
    await act(async () => renderWorkspace());
    expect(container.querySelector('.stateful-list')).toBe(listButton);
    expect(container.querySelector('.case-detail')).not.toBeNull();
    expect(listLifecycle.mounts).toBe(1);
    expect(listLifecycle.unmounts).toBe(0);

    selectedSegment.current = null;
    await act(async () => renderWorkspace());
    expect(container.querySelector('.stateful-list')).toBe(listButton);
    expect(listButton.textContent).toBe('Selected');
    expect(container.querySelector('.case-detail')).toBeNull();
    expect(listLifecycle.mounts).toBe(1);
    expect(listLifecycle.unmounts).toBe(0);

    await act(async () => root.unmount());
  });

  it('opens the first case only when no detail is selected', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    replaceMock.mockClear();
    selectedSegment.current = null;
    treeState.entries[2].cases = [{ id: 72 }];
    const render = () =>
      root.render(
        <CasesWorkspace
          projectId="1"
          folderId="2"
          messages={messages}
          runDialogMessages={{
            run: '',
            runName: '',
            runDescription: '',
            close: '',
            create: '',
            update: '',
            pleaseEnter: '',
          }}
          priorityMessages={{ critical: '', high: '', medium: '', low: '' }}
          testTypeMessages={{}}
          locale="zh-CN"
        >
          <div>Detail</div>
        </CasesWorkspace>
      );
    await act(async () => render());
    expect(replaceMock).toHaveBeenCalledWith('/projects/1/folders/2/cases/72', { locale: 'zh-CN', scroll: false });
    replaceMock.mockClear();
    selectedSegment.current = '73';
    await act(async () => render());
    expect(replaceMock).not.toHaveBeenCalled();
    treeState.entries[2].cases = [];
    await act(async () => root.unmount());
  });
});
