/* @vitest-environment happy-dom */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectHome } from './ProjectHome';
import type { HomeMessages } from './page';

(globalThis as typeof globalThis & { React: typeof React }).React = React;
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { chartCalls } = vi.hoisted(() => ({
  chartCalls: {
    progress: [] as unknown[],
    types: [] as unknown[],
    priority: [] as unknown[],
  },
}));

vi.mock('@heroui/react', async () => {
  const ReactModule = await import('react');
  const passthrough = ({ children }: { children?: React.ReactNode }) =>
    ReactModule.createElement('div', null, children);
  return { Card: passthrough, CardBody: passthrough, Chip: passthrough, Divider: () => null };
});

vi.mock('lucide-react', () => ({ Clipboard: () => null, FlaskConical: () => null, Folder: () => null }));
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'light' }) }));
vi.mock('@/config/config', () => ({ default: { apiServer: '/api' } }));
vi.mock('@/components/primitives', () => ({ title: () => '', subtitle: () => '' }));
vi.mock('@/utils/errorHandler', () => ({ logError: vi.fn() }));
vi.mock('@/utils/caseTypesControls', () => ({
  fetchCaseTypes: vi.fn().mockResolvedValue([{ id: 1, name: '功能', sortOrder: 0, projectId: null }]),
}));
vi.mock('@/utils/TokenProvider', async () => {
  const ReactModule = await import('react');
  return {
    TokenContext: ReactModule.createContext({
      token: { access_token: 'token', user: { id: 1 } },
      isSignedIn: () => true,
    }),
  };
});
vi.mock('./TestProgressColumnChart', async () => {
  const ReactModule = await import('react');
  return {
    default: (props: unknown) => {
      chartCalls.progress.push(props);
      return ReactModule.createElement('div');
    },
  };
});
vi.mock('./TestTypesDonutChart', async () => {
  const ReactModule = await import('react');
  return {
    default: (props: unknown) => {
      chartCalls.types.push(props);
      return ReactModule.createElement('div');
    },
  };
});
vi.mock('./TestPriorityDonutChart', async () => {
  const ReactModule = await import('react');
  return {
    default: (props: unknown) => {
      chartCalls.priority.push(props);
      return ReactModule.createElement('div');
    },
  };
});

const messages = {
  folders: 'Folders',
  testCases: 'Cases',
  testRuns: 'Runs',
  progress: 'Progress',
  testClassification: 'Classification',
  byType: 'By type',
  byPriority: 'By priority',
  accessDenied: 'Access denied',
} as HomeMessages;

describe('ProjectHome rendering', () => {
  beforeEach(() => {
    chartCalls.progress.length = 0;
    chartCalls.types.length = 0;
    chartCalls.priority.length = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => ({
          id: 4,
          name: 'Project',
          detail: '',
          Folders: [{ id: 20, Cases: [{ type: 0, priority: 2 }] }],
          Runs: [
            {
              id: 3,
              RunCases: [{ status: 1, createdAt: '2026-07-16T08:00:00.000Z' }],
            },
          ],
        }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mounts charts once with complete aggregate data', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ProjectHome
          projectId="4"
          messages={messages}
          testRunCaseStatusMessages={{
            untested: 'Untested',
            passed: 'Passed',
            failed: 'Failed',
            retest: 'Retest',
            skipped: 'Skipped',
          }}
          testTypeMessages={{}}
          priorityMessages={{ critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }}
        />
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(chartCalls.progress).toHaveLength(1);
    expect(chartCalls.types).toHaveLength(1);
    expect(chartCalls.priority).toHaveLength(1);
    expect(chartCalls.progress[0]).toMatchObject({
      progressCategories: ['2026-07-16'],
      progressSeries: [
        { name: 'Untested', data: [0] },
        { name: 'Passed', data: [1] },
        { name: 'Failed', data: [0] },
        { name: 'Retest', data: [0] },
        { name: 'Skipped', data: [0] },
      ],
    });
    expect(chartCalls.types[0]).toMatchObject({ typesCounts: [{ type: 0, count: 1 }] });
    await act(async () => root.unmount());
  });
});
