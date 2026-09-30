import { useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  DropdownTrigger,
  Dropdown,
  DropdownMenu,
  DropdownItem,
  Selection,
  SortDescriptor,
  Chip,
  Input,
  Pagination,
} from '@heroui/react';
import { MoreVertical, CopyMinus, MessageCircle, Tag, Search } from 'lucide-react';
import RunCaseStatus from './RunCaseStatus';
import AssigneePicker from './AssigneePicker';
import { testRunCaseStatus } from '@/config/selection';
import { CaseType } from '@/types/case';
import { RunDetailTab, RunMessages } from '@/types/run';
import { PriorityMessages } from '@/types/priority';
import TestCasePriority from '@/components/TestCasePriority';
import { TestTypeMessages } from '@/types/testType';
import { TestRunCaseStatusMessages } from '@/types/status';
import { MemberType } from '@/types/user';

const CASES_PER_PAGE = 50;

type Props = {
  projectId: string;
  runId: string;
  locale: string;
  cases: CaseType[];
  isDisabled: boolean;
  isManager: boolean;
  members: MemberType[];
  selectedKeys: Selection;
  onSelectionChange: React.Dispatch<React.SetStateAction<Selection>>;
  onChangeStatus: (changeCaseId: number, status: number) => void;
  onExcludeCase: (excludeCaseId: number) => void;
  onAssignCase: (caseId: number, runCaseId: number, userId: number | null) => void;
  onOpenCase: (caseId: number, tab: RunDetailTab) => void;
  messages: RunMessages;
  testRunCaseStatusMessages: TestRunCaseStatusMessages;
  priorityMessages: PriorityMessages;
  testTypeMessages: TestTypeMessages;
};

export default function TestCaseSelector({
  projectId,
  runId,
  locale,
  cases,
  isDisabled,
  isManager,
  members,
  selectedKeys,
  onSelectionChange,
  onChangeStatus,
  onExcludeCase,
  onAssignCase,
  onOpenCase,
  messages,
  testRunCaseStatusMessages,
  priorityMessages,
}: Props) {
  const headerColumns = [
    { name: messages.id, uid: 'caseNo', sortable: true },
    { name: messages.title, uid: 'title', sortable: true },
    { name: messages.priority, uid: 'priority', sortable: true },
    { name: messages.tags, uid: 'tags', sortable: false },
    { name: messages.status, uid: 'runStatus', sortable: true },
    { name: messages.assignee, uid: 'assignee', sortable: true },
    { name: messages.comments, uid: 'comments', sortable: false },
    { name: messages.actions, uid: 'actions' },
  ];

  const [disabledStatusKeys, setDisabledStatusKeys] = useState<string[]>([]);
  const [disabledIncludeExcludeKeys, setDisabledIncludeExcludeKeys] = useState<string[]>([]);
  useEffect(() => {
    if (isDisabled) {
      setDisabledStatusKeys(
        testRunCaseStatus.map((entry) => {
          return entry.uid;
        })
      );
      setDisabledIncludeExcludeKeys(['exclude']);
    } else {
      setDisabledStatusKeys([]);
      setDisabledIncludeExcludeKeys([]);
    }
  }, [isDisabled]);

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'caseNo',
    direction: 'ascending',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const sortedItems = useMemo(() => {
    return [...cases].sort((a: CaseType, b: CaseType) => {
      let first: number | string, second: number | string;

      switch (sortDescriptor.column) {
        case 'runStatus':
          first = a.RunCases && a.RunCases.length > 0 ? a.RunCases[0].status : -1;
          second = b.RunCases && b.RunCases.length > 0 ? b.RunCases[0].status : -1;
          break;
        case 'title':
          first = a.title;
          second = b.title;
          break;
        case 'priority':
          first = a.priority;
          second = b.priority;
          break;
        case 'assignee':
          first = a.RunCases && a.RunCases.length > 0 ? a.RunCases[0].assigneeUserId || -1 : -1;
          second = b.RunCases && b.RunCases.length > 0 ? b.RunCases[0].assigneeUserId || -1 : -1;
          break;
        case 'caseNo':
          first = a.caseNo ?? a.id;
          second = b.caseNo ?? b.id;
          break;
        case 'id':
        default:
          first = a.id;
          second = b.id;
          break;
      }

      const cmp = first < second ? -1 : first > second ? 1 : 0;

      return sortDescriptor.direction === 'descending' ? -cmp : cmp;
    });
  }, [sortDescriptor, cases]);

  const allCaseKeys = useMemo(() => new Set(cases.map((testCase) => String(testCase.id))), [cases]);
  const visibleItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return sortedItems;
    }

    return sortedItems.filter((testCase) =>
      [testCase.title, testCase.description].some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [searchQuery, sortedItems]);
  const pageCount = Math.max(1, Math.ceil(visibleItems.length / CASES_PER_PAGE));
  const activePage = Math.min(currentPage, pageCount);
  const paginatedItems = useMemo(() => {
    const startIndex = (activePage - 1) * CASES_PER_PAGE;
    return visibleItems.slice(startIndex, startIndex + CASES_PER_PAGE);
  }, [activePage, visibleItems]);
  const pageCaseKeys = useMemo(() => new Set(paginatedItems.map((testCase) => String(testCase.id))), [paginatedItems]);
  const tableSelectedKeys = useMemo(() => {
    const currentSelectedKeys =
      selectedKeys === 'all' ? allCaseKeys : new Set(Array.from(selectedKeys).map((key) => String(key)));

    return new Set(Array.from(currentSelectedKeys).filter((key) => pageCaseKeys.has(key)));
  }, [allCaseKeys, pageCaseKeys, selectedKeys]);

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  const notIncludedCaseClass = 'text-neutral-200 dark:text-neutral-600';

  const isCaseIncluded = (testCase: CaseType) => {
    let isIncluded = false;
    if (testCase.RunCases && testCase.RunCases.length > 0) {
      if (testCase.RunCases[0].editState !== 'deleted') {
        // Even if RunCase[0] exists, if 'deleted' it will be as not included.
        isIncluded = true;
      }
    }

    return isIncluded;
  };
  const renderCell = (testCase: CaseType, columnKey: string): ReactNode => {
    const cellValue = testCase[columnKey as keyof CaseType];
    const isIncluded = isCaseIncluded(testCase);
    const runStatus = testCase.RunCases && testCase.RunCases.length > 0 ? testCase.RunCases[0].status : 0;
    const commentCount = testCase.RunCases && testCase.RunCases.length > 0 ? testCase.RunCases[0].commentCount || 0 : 0;

    switch (columnKey) {
      case 'caseNo':
        return <span>{testCase.caseNo ?? testCase.id}</span>;
      case 'title':
        return (
          <div className={isIncluded ? '' : notIncludedCaseClass}>
            <button
              type="button"
              className="block whitespace-nowrap text-left text-medium text-primary hover:underline hover:opacity-80 active:opacity-disabled transition-opacity underline-offset-4 dark:text-white"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onOpenCase(testCase.id, 'caseDetail');
              }}
            >
              {cellValue as string}
            </button>
          </div>
        );
      case 'priority':
        return (
          <div className={isIncluded ? '' : notIncludedCaseClass}>
            <TestCasePriority priorityValue={cellValue as number} priorityMessages={priorityMessages} />
          </div>
        );
      case 'tags':
        return (
          <div className={`flex gap-1 flex-wrap ${isIncluded ? '' : notIncludedCaseClass}`}>
            <button
              type="button"
              className="inline-flex items-center gap-1"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onOpenCase(testCase.id, 'caseDetail');
              }}
              aria-label={`${messages.tags}: ${testCase.title}`}
            >
              {testCase.Tags && testCase.Tags.length > 0 ? (
                testCase.Tags.map((tag) => (
                  <Chip key={tag.id} size="sm" variant="flat">
                    {tag.name}
                  </Chip>
                ))
              ) : (
                <>
                  <Tag size={14} />
                  <span>-</span>
                </>
              )}
            </button>
          </div>
        );
      case 'runStatus':
        return (
          <Dropdown>
            <DropdownTrigger>
              <Button
                isIconOnly
                radius="full"
                size="sm"
                variant="light"
                title={isIncluded ? testRunCaseStatusMessages[testRunCaseStatus[runStatus].uid] : undefined}
                isDisabled={!isIncluded || isDisabled}
              >
                {isIncluded ? <RunCaseStatus uid={testRunCaseStatus[runStatus].uid} /> : '-'}
              </Button>
            </DropdownTrigger>
            <DropdownMenu disabledKeys={disabledStatusKeys} aria-label="test case actions">
              {testRunCaseStatus.map((runCaseStatus, index) => (
                <DropdownItem
                  key={runCaseStatus.uid}
                  startContent={<RunCaseStatus uid={runCaseStatus.uid} />}
                  onPress={() => onChangeStatus(testCase.id, index)}
                >
                  {testRunCaseStatusMessages[runCaseStatus.uid]}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        );
      case 'assignee': {
        const runCaseId = testCase.RunCases && testCase.RunCases.length > 0 ? testCase.RunCases[0].id : null;
        const currentAssignee =
          testCase.RunCases && testCase.RunCases.length > 0 ? testCase.RunCases[0].assigneeUserId : null;
        if (!isIncluded || !runCaseId) {
          return <span className={notIncludedCaseClass}>-</span>;
        }
        return (
          <AssigneePicker
            isAvatarOnly={true}
            assigneeUserId={currentAssignee ?? null}
            members={members}
            isDisabled={!isManager}
            unassignedLabel={messages.unassigned}
            searchPlaceholder={messages.searchAssignee}
            onAssign={(userId) => onAssignCase(testCase.id, runCaseId, userId)}
          />
        );
      }
      case 'comments':
        return (
          <div className={isIncluded ? '' : notIncludedCaseClass}>
            {isIncluded ? (
              <button
                type="button"
                className="flex items-center gap-1"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCase(testCase.id, 'comments');
                }}
                aria-label={`${messages.comments}: ${testCase.title}`}
              >
                <MessageCircle size={16} />
                <span>{commentCount}</span>
              </button>
            ) : (
              <span className="text-default-400">-</span>
            )}
          </div>
        );
      case 'actions':
        return (
          <Dropdown>
            <DropdownTrigger>
              <Button isIconOnly radius="full" size="sm" variant="light" isDisabled={isDisabled}>
                <MoreVertical size={16} />
              </Button>
            </DropdownTrigger>
            <DropdownMenu disabledKeys={disabledIncludeExcludeKeys} aria-label="include or exclude actions">
              <DropdownItem
                key="exclude"
                startContent={<CopyMinus size={16} />}
                onPress={() => {
                  if (!isIncluded) {
                    return;
                  }
                  onExcludeCase(testCase.id);
                }}
              >
                {messages.excludeFromRun}
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        );
      default:
        return cellValue as string;
    }
  };

  const classNames = useMemo(
    () => ({
      base: ['run-case-selector'],
      wrapper: ['min-w-3xl'],
      table: ['w-max', 'min-w-full'],
      th: ['bg-transparent', 'text-default-500', 'border-b', 'border-divider'],
      td: [
        // changing the rows border radius
        // first
        'group-data-[first=true]:first:before:rounded-none',
        'group-data-[first=true]:last:before:rounded-none',
        // middle
        'group-data-[middle=true]:before:rounded-none',
        // last
        'group-data-[last=true]:first:before:rounded-none',
        'group-data-[last=true]:last:before:rounded-none',
      ],
    }),
    []
  );

  const handleSelectionChange = (keys: Selection) => {
    const normalizedSearchQuery = searchQuery.trim();
    if (keys === 'all' && normalizedSearchQuery.length === 0 && pageCount === 1) {
      onSelectionChange('all');
      return;
    }

    const currentSelectedKeys =
      selectedKeys === 'all'
        ? allCaseKeys
        : new Set(
            Array.from(selectedKeys)
              .map((key) => String(key))
              .filter((key) => allCaseKeys.has(key))
          );
    const nextSelectedKeys = keys === 'all' ? new Set(pageCaseKeys) : new Set(Array.from(keys).map(String));

    currentSelectedKeys.forEach((key) => {
      if (!pageCaseKeys.has(key)) {
        nextSelectedKeys.add(key);
      }
    });

    onSelectionChange(new Set(Array.from(allCaseKeys).filter((key) => nextSelectedKeys.has(key))));
  };

  return (
    <>
      <div className="mb-2 flex justify-end">
        <Input
          aria-label={messages.caseTitleOrDescription}
          placeholder={messages.caseTitleOrDescription}
          size="sm"
          variant="bordered"
          type="search"
          value={searchQuery}
          onValueChange={(value) => {
            setSearchQuery(value);
            setCurrentPage(1);
          }}
          startContent={<Search size={16} />}
          classNames={{
            base: 'w-full max-w-xs',
            input: 'text-small',
          }}
        />
      </div>
      <Table
        isCompact
        removeWrapper
        aria-label="Tese cases table"
        classNames={classNames}
        selectedKeys={tableSelectedKeys}
        selectionMode="multiple"
        sortDescriptor={sortDescriptor}
        onSelectionChange={handleSelectionChange}
        onSortChange={(descriptor) => {
          setSortDescriptor(descriptor);
          setCurrentPage(1);
        }}
      >
        <TableHeader columns={headerColumns}>
          {(column) => (
            <TableColumn
              key={column.uid}
              align={column.uid === 'actions' ? 'center' : 'start'}
              allowsSorting={column.sortable}
            >
              {column.name}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody emptyContent={messages.noCasesFound}>
          {paginatedItems.map((item) => (
            <TableRow key={item.id} className={isCaseIncluded(item) ? '' : notIncludedCaseClass}>
              {headerColumns.map((column) => (
                <TableCell key={column.uid}>{renderCell(item, column.uid)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pageCount > 1 && (
        <div className="flex justify-center py-3">
          <Pagination
            aria-label={messages.selectTestCase}
            size="sm"
            showControls
            total={pageCount}
            page={activePage}
            onChange={setCurrentPage}
          />
        </div>
      )}
    </>
  );
}
