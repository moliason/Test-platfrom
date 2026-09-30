/* @vitest-environment happy-dom */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FoldersPane from './FoldersPane';
import type { FoldersMessages } from '@/types/folder';

(globalThis as typeof globalThis & { React: typeof React }).React = React;
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { fetchFoldersMock, pathnameState, routerMock, routerPushMock, rendererState } = vi.hoisted(() => {
  const push = vi.fn();
  return {
    fetchFoldersMock: vi.fn(),
    pathnameState: { current: '/projects/4/folders/20/cases' },
    routerMock: { push },
    routerPushMock: push,
    rendererState: { current: undefined as unknown },
  };
});

vi.mock('@heroui/react', async () => {
  const ReactModule = await import('react');
  return {
    Button: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement('button', null, children),
  };
});
vi.mock('lucide-react', () => ({ Plus: () => null }));
vi.mock('next/navigation', () => ({
  useParams: () => ({ folderId: '20' }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('./CaseTreeProvider', async () => {
  const ReactModule = await import('react');
  return {
    CaseTreeContext: ReactModule.createContext({
      entries: {},
      loadCases: vi.fn(),
      selectedIds: new Set(),
      setSelectedIds: vi.fn(),
      messages: {},
    }),
  };
});
vi.mock('react-arborist', async () => {
  const ReactModule = await import('react');
  return {
    Tree: ReactModule.forwardRef(function Tree({ data, children }: { data: Array<{ name: string }>; children: unknown }, _ref) {
      rendererState.current = children;
      return ReactModule.createElement('div', { className: 'rendered-folders' }, data.map((folder) => folder.name).join('|'));
    }),
  };
});
vi.mock('./FolderDialog', () => ({ default: () => null }));
vi.mock('./FolderItem', () => ({ default: () => null }));
vi.mock('@/components/DeleteConfirmDialog', () => ({ default: () => null }));
vi.mock('./foldersControl', () => ({
  fetchFolders: fetchFoldersMock,
  createFolder: vi.fn(),
  updateFolder: vi.fn(),
  deleteFolder: vi.fn(),
}));
vi.mock('@/src/i18n/routing', () => ({
  usePathname: () => pathnameState.current,
  useRouter: () => routerMock,
}));
vi.mock('@/utils/useGetCurrentIds', () => ({ default: () => ({ projectId: 4, folderId: 20 }) }));
vi.mock('@/utils/errorHandler', () => ({ logError: vi.fn() }));
vi.mock('@/utils/testCaseMoveEvent', () => ({ emitMoveEvent: vi.fn() }));
vi.mock('@/utils/TokenProvider', async () => {
  const ReactModule = await import('react');
  return {
    TokenContext: ReactModule.createContext({
      token: { access_token: 'token' },
      isSignedIn: () => true,
      isProjectDeveloper: () => true,
    }),
  };
});

const messages = {
  newFolder: 'New folder',
} as FoldersMessages;

describe('FoldersPane navigation', () => {
  beforeEach(() => {
    pathnameState.current = '/projects/4/folders/20/cases';
    fetchFoldersMock.mockReset();
    routerPushMock.mockReset();
    fetchFoldersMock.mockResolvedValue([
      {
        id: 20,
        name: 'Folder',
        detail: '',
        projectId: 4,
        parentFolderId: null,
        createdAt: '',
        updatedAt: '',
        Cases: [],
      },
    ]);
  });

  it('does not reload the folder tree when opening a case detail', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<FoldersPane projectId="4" messages={messages} locale="zh-CN" />);
      await Promise.resolve();
    });
    expect(fetchFoldersMock).toHaveBeenCalledTimes(1);
    const nodeRenderer = rendererState.current;

    pathnameState.current = '/projects/4/folders/20/cases/1532';
    await act(async () => {
      root.render(<FoldersPane projectId="4" messages={messages} locale="zh-CN" />);
      await Promise.resolve();
    });

    expect(fetchFoldersMock).toHaveBeenCalledTimes(1);
    expect(rendererState.current).toBe(nodeRenderer);
    await act(async () => root.unmount());
  });

  it('fits the folder content to its pane without a separate vertical scrollbar', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<FoldersPane projectId="4" messages={messages} locale="zh-CN" />);
      await Promise.resolve();
    });

    expect(container.firstElementChild?.className).toContain('h-full');
    expect(container.firstElementChild?.className).not.toContain('min-h-[calc(100vh-64px)]');
    await act(async () => root.unmount());
  });

  it('shows the cached folder tree while refreshing it in the background after returning', async () => {
    const folder = {
      id: 20,
      name: 'Cached folder',
      detail: '',
      projectId: 4,
      parentFolderId: null,
      createdAt: '',
      updatedAt: '',
      Cases: [],
    };
    fetchFoldersMock.mockReset();
    fetchFoldersMock.mockResolvedValueOnce([folder]);
    const firstContainer = document.createElement('div');
    const firstRoot = createRoot(firstContainer);

    await act(async () => {
      firstRoot.render(<FoldersPane projectId="cache-project" messages={messages} locale="zh-CN" />);
      await Promise.resolve();
    });
    expect(firstContainer.querySelector('.rendered-folders')?.textContent).toBe('Cached folder');
    await act(async () => firstRoot.unmount());

    let resolveRefresh: (folders: (typeof folder)[]) => void = () => undefined;
    fetchFoldersMock.mockImplementationOnce(
      () =>
        new Promise<(typeof folder)[]>((resolve) => {
          resolveRefresh = resolve;
        })
    );
    const secondContainer = document.createElement('div');
    const secondRoot = createRoot(secondContainer);

    await act(async () => {
      secondRoot.render(<FoldersPane projectId="cache-project" messages={messages} locale="zh-CN" />);
    });

    expect(secondContainer.querySelector('.rendered-folders')?.textContent).toBe('Cached folder');

    await act(async () => {
      resolveRefresh([{ ...folder, name: 'Updated folder' }]);
      await Promise.resolve();
    });
    expect(secondContainer.querySelector('.rendered-folders')?.textContent).toBe('Updated folder');
    await act(async () => secondRoot.unmount());
  });
});
