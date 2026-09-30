/* @vitest-environment happy-dom */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import TestCaseTable from './TestCaseTable';
import type { CasesMessages } from '@/types/case';

(globalThis as typeof globalThis & { React: typeof React }).React = React;
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { checkboxRenderCount } = vi.hoisted(() => ({ checkboxRenderCount: { current: 0 } }));

vi.mock('@heroui/react', async () => {
  const ReactModule = await import('react');
  const passthrough = ({ children }: { children?: React.ReactNode }) =>
    ReactModule.createElement('div', null, children);

  return {
    Badge: passthrough,
    Button: ({ children, onPress }: { children?: React.ReactNode; onPress?: () => void }) =>
      ReactModule.createElement('button', { onClick: onPress }, children),
    Card: passthrough,
    CardBody: passthrough,
    Checkbox: ({ isSelected, onChange }: { isSelected?: boolean; onChange?: () => void }) => {
      checkboxRenderCount.current += 1;
      return ReactModule.createElement('input', {
        type: 'checkbox',
        checked: isSelected,
        onChange,
      });
    },
    Chip: passthrough,
    Dropdown: passthrough,
    DropdownItem: ({ children, onPress }: { children?: React.ReactNode; onPress?: () => void }) =>
      ReactModule.createElement('button', { onClick: onPress }, children),
    DropdownMenu: passthrough,
    DropdownTrigger: passthrough,
    Popover: passthrough,
    PopoverContent: passthrough,
    PopoverTrigger: passthrough,
  };
});

vi.mock('@heroui/theme', () => ({
  table: () => ({
    table: () => '',
    tbody: () => '',
    td: () => '',
    th: () => '',
    thead: () => '',
    tr: () => '',
  }),
}));

vi.mock('lucide-react', () => ({
  ChevronDown: () => null,
  ChevronUp: () => null,
  FileDown: () => null,
  FileJson: () => null,
  FileSpreadsheet: () => null,
  FileUp: () => null,
  Filter: () => null,
  MoreVertical: () => null,
  Plus: () => null,
  Trash: () => null,
}));

vi.mock('./TestCaseFilter', () => ({ default: () => null }));
vi.mock('@/components/TestCasePriority', () => ({ default: () => null }));
vi.mock('@/src/i18n/routing', async () => {
  const ReactModule = await import('react');
  return {
    Link: ({ children, href }: { children?: React.ReactNode; href: string }) =>
      ReactModule.createElement('a', { href }, children),
    NextUiLinkClasses: 'link',
  };
});
vi.mock('@/utils/testCaseMoveEvent', () => ({ onMoveEvent: () => () => undefined }));

const messages = {
  testCaseList: 'Test cases',
  id: 'ID',
  title: 'Title',
  priority: 'Priority',
  tags: 'Tags',
  actions: 'Actions',
  deleteCase: 'Delete case',
  delete: 'Delete',
  filter: 'Filter',
  export: 'Export',
  import: 'Import',
  newTestCase: 'New',
} as CasesMessages;

const defaultProps: React.ComponentProps<typeof TestCaseTable> & { folderId: string } = {
  projectId: '1',
  folderId: '2',
  isDisabled: false,
  cases: Array.from({ length: 3 }, (_, index) => ({
    id: index + 1,
    caseNo: index + 1,
    title: `Case ${index + 1}`,
    state: 0,
    priority: 2,
    type: 0,
    automationStatus: 0,
    description: '',
    template: 1,
    preConditions: '',
    expectedResults: '',
    folderId: 2,
    Tags: [],
  })),
  onCreateCase: vi.fn(),
  onDeleteCase: vi.fn(),
  onDeleteCases: vi.fn(),
  onShowImportDialog: vi.fn(),
  onExportCases: vi.fn(),
  onFilterChange: vi.fn(),
  activeSearchFilter: '',
  activePriorityFilters: [],
  activeTypeFilters: [],
  activeTagFilters: [],
  messages,
  priorityMessages: { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' },
  testTypeMessages: {},
  locale: 'zh-CN',
};

describe('TestCaseTable selection performance', () => {
  it('rerenders only the header checkbox and the selected row', async () => {
    checkboxRenderCount.current = 0;
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<TestCaseTable {...defaultProps} />);
    });

    expect(checkboxRenderCount.current).toBe(4);
    expect(container.querySelector('.test-case-table')).not.toBeNull();
    const rowCheckboxes = container.querySelectorAll('tbody input[type="checkbox"]');
    expect(rowCheckboxes).toHaveLength(3);

    await act(async () => (rowCheckboxes[0] as HTMLInputElement).click());

    expect(checkboxRenderCount.current).toBe(6);
    expect((rowCheckboxes[0] as HTMLInputElement).checked).toBe(true);
    expect((rowCheckboxes[1] as HTMLInputElement).checked).toBe(false);
    expect((rowCheckboxes[2] as HTMLInputElement).checked).toBe(false);
    await act(async () => root.unmount());
  });

  it('keeps the toolbar visible while only the rows scroll vertically', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<TestCaseTable {...defaultProps} />);
    });

    const panel = container.querySelector('.test-case-list-panel');
    const toolbar = container.querySelector('.test-case-list-toolbar');
    const scrollRegion = container.querySelector('.test-case-table');
    const tableHeader = container.querySelector('thead');

    expect(panel).not.toBeNull();
    expect(toolbar).not.toBeNull();
    expect(scrollRegion).not.toBeNull();
    expect(tableHeader).not.toBeNull();
    expect(panel?.className).toContain('h-[calc(100dvh-4rem-1px)]');
    expect(scrollRegion?.className).toContain('overflow-y-auto');
    expect(scrollRegion?.className).toContain('overflow-x-hidden');
    expect(scrollRegion?.contains(toolbar)).toBe(false);
    expect(tableHeader?.className).toContain('sticky');

    await act(async () => root.unmount());
  });

  it('restores the row scroll position after returning to the same folder', async () => {
    window.sessionStorage.clear();
    const firstContainer = document.createElement('div');
    const firstRoot = createRoot(firstContainer);

    await act(async () => {
      firstRoot.render(<TestCaseTable {...defaultProps} />);
    });

    const firstScrollRegion = firstContainer.querySelector('.test-case-table') as HTMLDivElement;
    await act(async () => {
      firstScrollRegion.scrollTop = 720;
      firstScrollRegion.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    await act(async () => firstRoot.unmount());

    const secondContainer = document.createElement('div');
    const secondRoot = createRoot(secondContainer);
    await act(async () => {
      secondRoot.render(<TestCaseTable {...defaultProps} cases={[]} />);
    });

    const secondScrollRegion = secondContainer.querySelector('.test-case-table') as HTMLDivElement;
    expect(secondScrollRegion.scrollTop).toBe(0);

    await act(async () => {
      secondRoot.render(<TestCaseTable {...defaultProps} />);
    });

    expect(secondScrollRegion.scrollTop).toBe(720);
    await act(async () => secondRoot.unmount());
    window.sessionStorage.clear();
  });
});
