/* @vitest-environment happy-dom */
import React, { act, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import SidebarLayout from './layout';
import ProjectAccessGuard from './ProjectAccessGuard';
import { TokenContext } from '@/utils/TokenProvider';
import type { ProjectMessages } from '@/types/project';

(globalThis as typeof globalThis & { React: typeof React }).React = React;
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  fetchProject: vi.fn().mockResolvedValue(undefined),
  contextValue: {
    token: {
      access_token: 'token',
      expires_at: Date.now() + 60_000,
      user: null,
    },
    isSignedIn: () => true,
    isAdmin: () => false,
    isProjectOwner: () => false,
    isProjectManager: () => false,
    isProjectDeveloper: () => false,
    isProjectReporter: () => false,
    refreshProjectRoles: vi.fn(),
    setToken: vi.fn(),
    storeTokenToLocalStorage: vi.fn(),
    removeTokenFromLocalStorage: vi.fn(),
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    ({
      toggle_sidebar: 'Toggle Sidebar',
      home: 'Home',
      test_cases: 'Test Cases',
      test_runs: 'Test Runs',
      members: 'Members',
      settings: 'Settings',
      access_denied: 'You do not have access to this project',
    })[key] ?? key,
}));

vi.mock('./Sidebar', async () => {
  const ReactModule = await import('react');
  return { default: () => ReactModule.createElement('div', { 'data-testid': 'sidebar' }, 'Sidebar') };
});

vi.mock('@/utils/TokenProvider', async () => {
  const ReactModule = await import('react');
  return { TokenContext: ReactModule.createContext(mocks.contextValue) };
});

vi.mock('@/utils/projectsControl', () => ({ fetchProject: mocks.fetchProject }));

it('hides project navigation and content when the project is not visible', async () => {
  mocks.fetchProject.mockReset().mockResolvedValue(undefined);
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <SidebarLayout params={{ locale: 'zh-CN', projectId: '3' }}>
        <div>Project content</div>
      </SidebarLayout>
    );
  });

  expect(container.textContent).toContain('You do not have access to this project');
  expect(container.textContent).not.toContain('Project content');
  expect(container.querySelector('[data-testid="sidebar"]')).toBeNull();

  await act(async () => root.unmount());
});

it('keeps project content mounted when the context object changes with the same token', async () => {
  mocks.fetchProject.mockReset().mockResolvedValue({ id: 3 });
  let mountCount = 0;
  let unmountCount = 0;

  function StatefulProjectContent() {
    const [selected, setSelected] = useState(false);
    useEffect(() => {
      mountCount += 1;
      return () => {
        unmountCount += 1;
      };
    }, []);
    return <button onClick={() => setSelected(true)}>{selected ? 'Selected' : 'Not selected'}</button>;
  }

  const messages = {} as ProjectMessages;
  const firstContextValue = { ...mocks.contextValue };
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <TokenContext.Provider value={firstContextValue}>
        <ProjectAccessGuard projectId="3" locale="zh-CN" messages={messages} accessDenied="Access denied">
          <StatefulProjectContent />
        </ProjectAccessGuard>
      </TokenContext.Provider>
    );
    await Promise.resolve();
  });

  const stateButton = container.querySelector('button') as HTMLButtonElement;
  await act(async () => stateButton.click());
  expect(stateButton.textContent).toBe('Selected');

  const secondContextValue = { ...mocks.contextValue };
  await act(async () => {
    root.render(
      <TokenContext.Provider value={secondContextValue}>
        <ProjectAccessGuard projectId="3" locale="zh-CN" messages={messages} accessDenied="Access denied">
          <StatefulProjectContent />
        </ProjectAccessGuard>
      </TokenContext.Provider>
    );
    await Promise.resolve();
  });

  expect(mocks.fetchProject).toHaveBeenCalledTimes(1);
  expect(container.querySelector('button')).toBe(stateButton);
  expect(stateButton.textContent).toBe('Selected');
  expect(mountCount).toBe(1);
  expect(unmountCount).toBe(0);
  await act(async () => root.unmount());
});
