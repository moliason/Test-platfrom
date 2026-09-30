/* @vitest-environment happy-dom */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import RunEditor from './RunEditor';
import type { RunMessages } from '@/types/run';

(globalThis as typeof globalThis & { React: typeof React }).React = React;
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@heroui/react', async () => {
  const ReactModule = await import('react');
  const passthrough = ({ children }: { children?: React.ReactNode }) =>
    ReactModule.createElement('div', null, children);

  return {
    Button: ({
      children,
      onPress,
      isDisabled,
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      isDisabled?: boolean;
    }) => ReactModule.createElement('button', { disabled: isDisabled, onClick: onPress }, children),
    Input: () => null,
    Textarea: () => null,
    Select: passthrough,
    SelectItem: passthrough,
    Tooltip: passthrough,
    Divider: () => null,
    DropdownTrigger: passthrough,
    Dropdown: passthrough,
    DropdownMenu: passthrough,
    DropdownItem: ({ children, onPress }: { children?: React.ReactNode; onPress?: () => void }) =>
      ReactModule.createElement('button', { onClick: onPress }, children),
    addToast: vi.fn(),
    Badge: passthrough,
    Popover: passthrough,
    PopoverContent: passthrough,
    PopoverTrigger: passthrough,
  };
});

vi.mock('lucide-react', () => ({
  Save: () => null,
  ArrowLeft: () => null,
  ChevronDown: () => null,
  CopyPlus: () => null,
  CopyMinus: () => null,
  RotateCw: () => null,
  FileDown: () => null,
  FileSpreadsheet: () => null,
  FileCode: () => null,
  FileJson: () => null,
  ChevronRight: () => null,
  Folder: () => null,
  Filter: () => null,
}));
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'light' }) }));
vi.mock('react-arborist', () => ({ Tree: () => null }));
vi.mock('../runsControl', () => ({
  fetchRun: vi.fn().mockResolvedValue({
    run: { id: 3, name: 'Run', configurations: 0, description: '', state: 0, projectId: 2 },
    statusCounts: [],
  }),
  updateRun: vi.fn(),
  updateRunCases: vi.fn(),
  fetchProjectCases: vi.fn().mockImplementation(async () => [
    { id: 1, folderId: 5, RunCases: [{ id: 11, status: 0 }] },
    { id: 2, folderId: 5, RunCases: [] },
    { id: 3, folderId: 9, RunCases: [{ id: 13, status: 0 }] },
  ]),
  includeExcludeTestCases: vi.fn((_include, keys, _runId, cases) =>
    cases.map((item) =>
      keys.includes(item.id) ? { ...item, RunCases: [{ ...item.RunCases[0], editState: 'deleted' }] } : item
    )
  ),
  changeStatus: vi.fn((_caseId, _status, cases) => cases),
  exportRun: vi.fn(),
  assignRunCases: vi.fn(),
  fetchProjectMembersForRun: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../folders/foldersControl', () => ({ fetchFolders: vi.fn().mockResolvedValue([]) }));
vi.mock('./RunPregressDonutChart', () => ({ default: () => null }));
vi.mock('./TestCaseSelector', async () => {
  const ReactModule = await import('react');
  return {
    default: ({
      onSelectionChange,
      cases,
    }: {
      onSelectionChange: (keys: Set<number>) => void;
      cases: { id: number }[];
    }) =>
      ReactModule.createElement(
        'div',
        null,
        ReactModule.createElement('span', { 'data-testid': 'run-case-ids' }, cases.map((item) => item.id).join(',')),
        ReactModule.createElement('button', { onClick: () => onSelectionChange(new Set([1])) }, 'select one')
      ),
  };
});
vi.mock('./BulkCaseActions', async () => {
  const ReactModule = await import('react');
  return { default: () => ReactModule.createElement('div', { 'data-testid': 'bulk-actions' }, 'bulk actions') };
});
vi.mock('./TestRunFilter', () => ({ default: () => null }));
vi.mock('@/utils/tagsControls', () => ({ fetchTags: vi.fn().mockResolvedValue([]) }));
vi.mock('@/utils/caseTagsControls', () => ({ updateCaseTags: vi.fn() }));
vi.mock('@/src/i18n/routing', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/utils/TokenProvider', async () => {
  const ReactModule = await import('react');
  return {
    TokenContext: ReactModule.createContext({
      token: { access_token: 'token', user: { id: 1 } },
      isSignedIn: () => true,
      isProjectManager: () => true,
      isProjectDeveloper: () => true,
      isProjectReporter: () => true,
    }),
  };
});
vi.mock('@/utils/formGuard', () => ({ useFormGuard: () => undefined }));
vi.mock('@/utils/errorHandler', () => ({ logError: vi.fn() }));
vi.mock('@/components/TreeItem', () => ({ default: () => null }));
vi.mock('@/utils/buildFolderTree', () => ({ buildFolderTree: () => [] }));
vi.mock('@/components/StickyHorizontalScrollbar', () => ({ default: () => null }));

const messages = {
  selectTestCase: 'Select cases',
  includeInRun: 'Include in run',
  excludeFromRun: 'Exclude from run',
  testCaseSelection: 'Case selection',
  filter: 'Filter',
  export: 'Export',
  update: 'Update',
  updating: 'Updating',
  progress: 'Progress',
  refresh: 'Refresh',
  title: 'Title',
  description: 'Description',
  status: 'Status',
  backToRuns: 'Back',
} as RunMessages;

describe('RunEditor execution cases', () => {
  it('shows only included cases across folders and removes excluded cases from the list', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <RunEditor
          projectId="2"
          runId="3"
          messages={messages}
          runStatusMessages={{
            new: 'New',
            inProgress: 'In progress',
            underReview: 'Review',
            rejected: 'Rejected',
            done: 'Done',
            closed: 'Closed',
          }}
          testRunCaseStatusMessages={{
            untested: 'Untested',
            passed: 'Passed',
            failed: 'Failed',
            retest: 'Retest',
            skipped: 'Skipped',
          }}
          priorityMessages={{ critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }}
          testTypeMessages={{}}
          locale="zh-CN"
          onOpenCase={vi.fn()}
        />
      );
    });

    expect(container.querySelector('[data-testid="run-case-ids"]')?.textContent).toBe('1,3');
    expect(container.textContent).not.toContain('Include in run');
    const selectButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'select one'
    ) as HTMLButtonElement;
    await act(async () => selectButton.click());
    expect(container.querySelector('[data-testid="bulk-actions"]')).not.toBeNull();

    const excludeButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Exclude from run'
    ) as HTMLButtonElement;
    await act(async () => excludeButton.click());

    expect(container.querySelector('[data-testid="run-case-ids"]')?.textContent).toBe('3');
    expect(container.querySelector('[data-testid="bulk-actions"]')).toBeNull();
    await act(async () => root.unmount());
  });
});
