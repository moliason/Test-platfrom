/* @vitest-environment happy-dom */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import TestCaseSelector from './TestCaseSelector';
import type { RunMessages } from '@/types/run';

(globalThis as typeof globalThis & { React: typeof React }).React = React;
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@heroui/react', async () => {
  const ReactModule = await import('react');
  const passthrough = ({ children }: { children?: React.ReactNode }) =>
    ReactModule.createElement('div', null, children);

  return {
    Table: ({
      children,
      classNames,
      onSelectionChange,
    }: {
      children?: React.ReactNode;
      classNames?: { base?: string[]; table?: string[] };
      onSelectionChange?: (keys: 'all') => void;
    }) =>
      ReactModule.createElement(
        'div',
        {
          'data-testid': 'case-table',
          'data-base-classes': classNames?.base?.join(' ') ?? '',
          'data-table-classes': classNames?.table?.join(' ') ?? '',
        },
        ReactModule.createElement(
          'button',
          { 'data-testid': 'select-visible-all', onClick: () => onSelectionChange?.('all') },
          'select visible'
        ),
        children
      ),
    TableHeader: ({
      columns,
      children,
    }: {
      columns: { uid: string }[];
      children: (column: { uid: string }) => React.ReactNode;
    }) => ReactModule.createElement('div', null, columns.map(children)),
    TableColumn: passthrough,
    TableBody: passthrough,
    TableRow: passthrough,
    TableCell: passthrough,
    Input: ({
      value,
      placeholder,
      'aria-label': ariaLabel,
      onValueChange,
    }: {
      value?: string;
      placeholder?: string;
      'aria-label'?: string;
      onValueChange?: (value: string) => void;
    }) =>
      ReactModule.createElement('input', {
        value,
        placeholder,
        'aria-label': ariaLabel,
        onInput: (event: { target: { value: string } }) => onValueChange?.(event.target.value),
      }),
    Button: ({ children, onPress }: { children?: React.ReactNode; onPress?: () => void }) =>
      ReactModule.createElement('button', { onClick: onPress }, children),
    DropdownTrigger: passthrough,
    Dropdown: passthrough,
    DropdownMenu: passthrough,
    DropdownItem: ({ children, onPress }: { children?: React.ReactNode; onPress?: () => void }) =>
      ReactModule.createElement('button', { onClick: onPress }, children),
    Chip: passthrough,
    Pagination: ({
      page = 1,
      total = 1,
      onChange,
    }: {
      page?: number;
      total?: number;
      onChange?: (page: number) => void;
    }) =>
      ReactModule.createElement(
        'div',
        { 'data-testid': 'case-pagination' },
        Array.from({ length: total }, (_, index) => index + 1).map((pageNumber) =>
          ReactModule.createElement(
            'button',
            {
              key: pageNumber,
              'data-testid': `case-page-${pageNumber}`,
              'data-current': pageNumber === page,
              onClick: () => onChange?.(pageNumber),
            },
            pageNumber
          )
        )
      ),
  };
});

vi.mock('lucide-react', async () => {
  const ReactModule = await import('react');
  return {
    MoreVertical: () => null,
    Search: () => null,
    CopyPlus: () => null,
    CopyMinus: () => null,
    MessageCircle: () => ReactModule.createElement('span', null, 'comment-icon'),
    Tag: () => ReactModule.createElement('span', null, 'tag-icon'),
  };
});
vi.mock('./RunCaseStatus', () => ({ default: () => null }));
vi.mock('./AssigneePicker', () => ({ default: () => null }));
vi.mock('@/components/TestCasePriority', () => ({ default: () => null }));
vi.mock('@/src/i18n/routing', async () => {
  const ReactModule = await import('react');
  return {
    Link: ({ children, href }: { children?: React.ReactNode; href: string }) =>
      ReactModule.createElement('a', { href }, children),
    NextUiLinkClasses: 'link',
  };
});

const messages = {
  id: 'ID',
  title: 'Title',
  priority: 'Priority',
  tags: 'Tags',
  status: 'Status',
  assignee: 'Assignee',
  comments: 'Comments',
  actions: 'Actions',
  includeInRun: 'Include',
  excludeFromRun: 'Exclude',
  noCasesFound: 'No cases',
  caseTitleOrDescription: 'Case title or description',
  unassigned: 'Unassigned',
  searchAssignee: 'Search assignee',
} as RunMessages;

const testCase = {
  id: 7,
  caseNo: 4,
  title: 'Case title',
  state: 0,
  priority: 2,
  type: 0,
  automationStatus: 0,
  description: 'Description',
  template: 1,
  preConditions: '',
  expectedResults: '',
  folderId: 3,
  Tags: [{ id: 9, name: 'smoke' }],
  RunCases: [
    {
      id: 11,
      runId: 2,
      caseId: 7,
      status: 0,
      editState: 'notChanged' as const,
      commentCount: 2,
      assigneeUserId: null,
    },
  ],
};

describe('TestCaseSelector detail actions', () => {
  it('opens title and tag details without changing the selected rows', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onOpenCase = vi.fn();
    const onSelectionChange = vi.fn();

    await act(async () => {
      root.render(
        <TestCaseSelector
          projectId="1"
          runId="2"
          locale="zh-CN"
          cases={[testCase]}
          isDisabled={false}
          isManager={true}
          members={[]}
          selectedKeys={new Set([7])}
          onSelectionChange={onSelectionChange}
          onChangeStatus={vi.fn()}
          onExcludeCase={vi.fn()}
          onAssignCase={vi.fn()}
          onOpenCase={onOpenCase}
          messages={messages}
          testRunCaseStatusMessages={{
            untested: 'Untested',
            passed: 'Passed',
            failed: 'Failed',
            retest: 'Retest',
            skipped: 'Skipped',
          }}
          priorityMessages={{ critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }}
          testTypeMessages={{}}
        />
      );
    });

    const titleAction = Array.from(container.querySelectorAll('a, button')).find(
      (element) => element.textContent === testCase.title
    ) as HTMLElement;
    expect(titleAction.className).toContain('whitespace-nowrap');
    expect(titleAction.className).not.toContain('truncate');
    expect(titleAction.className).not.toContain('max-w-24');

    const table = container.querySelector('[data-testid="case-table"]') as HTMLElement;
    expect(table.dataset.baseClasses).toContain('run-case-selector');
    expect(table.dataset.tableClasses).toContain('w-max');
    expect(table.dataset.tableClasses).toContain('min-w-full');

    await act(async () => titleAction.click());

    const tagAction = Array.from(container.querySelectorAll('a, button')).find((element) =>
      element.textContent?.includes('smoke')
    ) as HTMLElement;
    await act(async () => tagAction.click());

    expect(onOpenCase).toHaveBeenNthCalledWith(1, 7, 'caseDetail');
    expect(onOpenCase).toHaveBeenNthCalledWith(2, 7, 'caseDetail');
    expect(onSelectionChange).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });

  it('opens comments in the detail pane without changing the selected rows', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onOpenCase = vi.fn();
    const onSelectionChange = vi.fn();

    await act(async () => {
      root.render(
        <TestCaseSelector
          projectId="1"
          runId="2"
          locale="zh-CN"
          cases={[testCase]}
          isDisabled={false}
          isManager={true}
          members={[]}
          selectedKeys={new Set([7])}
          onSelectionChange={onSelectionChange}
          onChangeStatus={vi.fn()}
          onExcludeCase={vi.fn()}
          onAssignCase={vi.fn()}
          onOpenCase={onOpenCase}
          messages={messages}
          testRunCaseStatusMessages={{
            untested: 'Untested',
            passed: 'Passed',
            failed: 'Failed',
            retest: 'Retest',
            skipped: 'Skipped',
          }}
          priorityMessages={{ critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }}
          testTypeMessages={{}}
        />
      );
    });

    const commentsAction = Array.from(container.querySelectorAll('a, button')).find((element) =>
      element.textContent?.includes('comment-icon')
    ) as HTMLElement;
    await act(async () => commentsAction.click());

    expect(onOpenCase).toHaveBeenCalledWith(7, 'comments');
    expect(onSelectionChange).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });

  it('filters visible cases by keyword while preserving hidden selections for multi-select', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onSelectionChange = vi.fn();
    const otherCase = { ...testCase, id: 8, caseNo: 5, title: 'Other case', description: 'Other description' };

    await act(async () => {
      root.render(
        <TestCaseSelector
          projectId="1"
          runId="2"
          locale="zh-CN"
          cases={[testCase, otherCase]}
          isDisabled={false}
          isManager={true}
          members={[]}
          selectedKeys={new Set([7])}
          onSelectionChange={onSelectionChange}
          onChangeStatus={vi.fn()}
          onExcludeCase={vi.fn()}
          onAssignCase={vi.fn()}
          onOpenCase={vi.fn()}
          messages={messages}
          testRunCaseStatusMessages={{
            untested: 'Untested',
            passed: 'Passed',
            failed: 'Failed',
            retest: 'Retest',
            skipped: 'Skipped',
          }}
          priorityMessages={{ critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }}
          testTypeMessages={{}}
        />
      );
    });

    const searchInput = container.querySelector('input[aria-label="Case title or description"]');
    expect(searchInput).not.toBeNull();
    await act(async () => {
      (searchInput as HTMLInputElement).value = 'Other';
      searchInput?.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(container.textContent).toContain('Other case');
    expect(container.textContent).not.toContain('Case title');

    const selectVisibleAllButton = container.querySelector('[data-testid="select-visible-all"]') as HTMLButtonElement;
    await act(async () => selectVisibleAllButton.click());

    expect(Array.from(onSelectionChange.mock.calls[0][0])).toEqual(['7', '8']);
    await act(async () => root.unmount());
  });

  it('renders only the active page and keeps the page after navigation', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onSelectionChange = vi.fn();
    const pagedCases = Array.from({ length: 51 }, (_, index) => ({
      ...testCase,
      id: index + 1,
      caseNo: index + 1,
      title: `Case ${index + 1}`,
    }));

    await act(async () => {
      root.render(
        <TestCaseSelector
          projectId="1"
          runId="2"
          locale="zh-CN"
          cases={pagedCases}
          isDisabled={false}
          isManager={true}
          members={[]}
          selectedKeys={new Set([])}
          onSelectionChange={onSelectionChange}
          onChangeStatus={vi.fn()}
          onExcludeCase={vi.fn()}
          onAssignCase={vi.fn()}
          onOpenCase={vi.fn()}
          messages={messages}
          testRunCaseStatusMessages={{
            untested: 'Untested',
            passed: 'Passed',
            failed: 'Failed',
            retest: 'Retest',
            skipped: 'Skipped',
          }}
          priorityMessages={{ critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }}
          testTypeMessages={{}}
        />
      );
    });

    expect(container.textContent).toContain('Case 1');
    expect(container.textContent).not.toContain('Case 51');

    const selectPageButton = container.querySelector('[data-testid="select-visible-all"]') as HTMLButtonElement;
    await act(async () => selectPageButton.click());
    expect(Array.from(onSelectionChange.mock.calls[0][0])).toEqual(
      Array.from({ length: 50 }, (_, index) => String(index + 1))
    );

    const secondPageButton = container.querySelector('[data-testid="case-page-2"]') as HTMLButtonElement;
    await act(async () => secondPageButton.click());

    expect(container.textContent).not.toContain('Case 1');
    expect(container.textContent).toContain('Case 51');
    await act(async () => root.unmount());
  });
});
