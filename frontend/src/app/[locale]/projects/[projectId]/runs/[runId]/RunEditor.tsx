'use client';
import { useState, useEffect, useContext, useRef, useMemo } from 'react';
import {
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Tooltip,
  Divider,
  Selection,
  DropdownTrigger,
  Dropdown,
  DropdownMenu,
  DropdownItem,
  addToast,
  Badge,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@heroui/react';
import {
  Save,
  ArrowLeft,
  ChevronDown,
  CopyMinus,
  RotateCw,
  FileDown,
  FileSpreadsheet,
  FileCode,
  FileJson,
  ChevronRight,
  Folder,
  Filter,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { NodeApi, Tree } from 'react-arborist';
import {
  fetchRun,
  updateRun,
  updateRunCases,
  fetchProjectCases,
  includeExcludeTestCases,
  changeStatus,
  exportRun,
  assignRunCases,
  fetchProjectMembersForRun,
} from '../runsControl';
import { fetchFolders } from '../../folders/foldersControl';
import RunProgressChart from './RunPregressDonutChart';
import TestCaseSelector from './TestCaseSelector';
import BulkCaseActions from './BulkCaseActions';
import TestRunFilter from './TestRunFilter';
import { fetchTags } from '@/utils/tagsControls';
import { updateCaseTags } from '@/utils/caseTagsControls';
import { useRouter } from '@/src/i18n/routing';
import { testRunStatus } from '@/config/selection';
import { RunType, RunStatusCountType, RunDetailTab, RunMessages } from '@/types/run';
import { CaseType } from '@/types/case';
import { TreeNodeData } from '@/types/folder';
import { TokenContext } from '@/utils/TokenProvider';
import { confirmFormNavigation, useFormGuard } from '@/utils/formGuard';
import { PriorityMessages } from '@/types/priority';
import { RunStatusMessages, TestRunCaseStatusMessages } from '@/types/status';
import { TestTypeMessages } from '@/types/testType';
import { MemberType } from '@/types/user';
import { logError } from '@/utils/errorHandler';
import TreeItem from '@/components/TreeItem';
import { buildFolderTree } from '@/utils/buildFolderTree';
import { applyBulkRunCaseChanges, groupRunCaseAssigneeUpdates } from '@/utils/runCaseBulkUpdates';
import { TagType } from '@/types/tag';
import StickyHorizontalScrollbar from '@/components/StickyHorizontalScrollbar';

const defaultTestRun = {
  id: 0,
  name: '',
  configurations: 0,
  description: '',
  state: 0,
  projectId: 0,
  createdAt: '',
  updatedAt: '',
};

type Props = {
  projectId: string;
  runId: string;
  messages: RunMessages;
  runStatusMessages: RunStatusMessages;
  testRunCaseStatusMessages: TestRunCaseStatusMessages;
  priorityMessages: PriorityMessages;
  testTypeMessages: TestTypeMessages;
  locale: string;
  onOpenCase: (caseId: number, tab: RunDetailTab) => void;
};

export default function RunEditor({
  projectId,
  runId,
  messages,
  runStatusMessages,
  testRunCaseStatusMessages,
  priorityMessages,
  testTypeMessages,
  locale,
  onOpenCase,
}: Props) {
  const tokenContext = useContext(TokenContext);
  const { theme } = useTheme();
  const [testRun, setTestRun] = useState<RunType>(defaultTestRun);
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [runStatusCounts, setRunStatusCounts] = useState<RunStatusCountType[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
  const [selectedFolder, setSelectedFolder] = useState<TreeNodeData | null>(null);
  const [testCases, setTestCases] = useState<CaseType[]>([]);
  const [isNameInvalid, setIsNameInvalid] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<number[]>([]);
  const [tagFilter, setTagFilter] = useState<number[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');
  const [members, setMembers] = useState<MemberType[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [pendingAssigneesByCaseId, setPendingAssigneesByCaseId] = useState<Map<number, number | null>>(new Map());
  const [pendingTags, setPendingTags] = useState<Map<number, number[]>>(new Map());
  const casesScrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const isManager = tokenContext.isProjectManager(Number(projectId));
  const isProjectDeveloper = tokenContext.isProjectDeveloper(Number(projectId));
  const isProjectReporter = tokenContext.isProjectReporter(Number(projectId));

  // not show warning when navigating to test case detail page
  useFormGuard(isDirty || isUpdating, messages.areYouSureLeave, [`/projects/${projectId}/runs/${runId}/cases/\\d+`]);

  const fetchRunAndStatusCount = async (updateDetails = true) => {
    const { run, statusCounts } = await fetchRun(tokenContext.token.access_token, Number(runId));
    if (updateDetails) setTestRun(run);
    setRunStatusCounts(statusCounts);
  };

  const initTestCases = async (search?: string, status?: string[], tag?: string[], assignee?: string) => {
    const casesData = await fetchProjectCases(
      tokenContext.token.access_token,
      Number(projectId),
      Number(runId),
      search,
      status,
      tag,
      assignee
    );
    casesData.forEach((testCase: CaseType) => {
      if (testCase.RunCases && testCase.RunCases.length > 0) {
        testCase.RunCases[0].editState = 'notChanged';
      }
    });
    setTestCases(casesData);
  };

  const isSignedIn = tokenContext.isSignedIn();
  useEffect(() => {
    if (!isSignedIn) return;

    async function fetchDataEffect() {
      if (!tokenContext.isSignedIn()) {
        return;
      }

      try {
        await fetchRunAndStatusCount();
        const foldersData = await fetchFolders(tokenContext.token.access_token, Number(projectId));
        const tree = buildFolderTree(foldersData);
        setTreeData(tree);
        setSelectedFolder(null);
        initTestCases();
        const [membersData, tagsData] = await Promise.all([
          fetchProjectMembersForRun(tokenContext.token.access_token, projectId),
          fetchTags(tokenContext.token.access_token, projectId),
        ]);
        setMembers(membersData || []);
        setTags(tagsData || []);
      } catch (error: unknown) {
        logError('Error fetching run data', error);
      }
    }

    fetchDataEffect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  const runFolders = useMemo(() => {
    const folderIds = new Set(
      testCases
        .filter((testCase) => testCase.RunCases?.[0] && testCase.RunCases[0].editState !== 'deleted')
        .map((testCase) => String(testCase.folderId))
    );
    return treeData.filter((folder) => folderIds.has(folder.id));
  }, [testCases, treeData]);

  useEffect(() => {
    if (selectedFolder && !runFolders.some((folder) => folder.id === selectedFolder.id)) {
      setSelectedFolder(null);
      setSelectedKeys(new Set());
    }
  }, [runFolders, selectedFolder]);

  const filteredTestCases = useMemo(
    () =>
      testCases.filter(
        (testCase) =>
          testCase.RunCases?.[0] &&
          testCase.RunCases[0].editState !== 'deleted' &&
          (!selectedFolder || String(testCase.folderId) === selectedFolder.id)
      ),
    [selectedFolder, testCases]
  );

  const selectedCaseIds =
    selectedKeys === 'all' ? filteredTestCases.map((testCase) => testCase.id) : Array.from(selectedKeys).map(Number);

  const handleChangeStatus = async (changeCaseId: number, newStatus: number) => {
    setIsDirty(true);
    const newTestCases = changeStatus(changeCaseId, newStatus, testCases);
    setTestCases(newTestCases);
  };

  const handleExcludeCases = (caseIds: number[]) => {
    setIsDirty(true);
    setTestCases((current) => includeExcludeTestCases(false, caseIds, Number(runId), current));
    setSelectedKeys(new Set());
  };

  const handleAssignCase = (caseId: number, userId: number | null) => {
    setIsDirty(true);
    setTestCases((current) =>
      current.map((tc) => {
        if (tc.id === caseId && tc.RunCases?.[0]) {
          return { ...tc, RunCases: [{ ...tc.RunCases[0], assigneeUserId: userId }] };
        }
        return tc;
      })
    );
    setPendingAssigneesByCaseId((prev) => new Map(prev).set(caseId, userId));
  };

  const handleBulkAssignCases = (userId: number | null) => {
    const selectedIncludedCaseIds = selectedCaseIds.filter((caseId) => {
      const tc = testCases.find((t) => t.id === caseId);
      return Boolean(tc?.RunCases?.[0]);
    });
    if (selectedIncludedCaseIds.length === 0) return;

    setIsDirty(true);
    setTestCases((current) =>
      current.map((tc) => {
        if (tc.RunCases?.[0] && selectedIncludedCaseIds.includes(tc.id)) {
          return { ...tc, RunCases: [{ ...tc.RunCases[0], assigneeUserId: userId }] };
        }
        return tc;
      })
    );
    setPendingAssigneesByCaseId((prev) => {
      const next = new Map(prev);
      selectedIncludedCaseIds.forEach((caseId) => next.set(caseId, userId));
      return next;
    });
  };

  const handleBulkStatus = (status: number) => {
    if (selectedCaseIds.length === 0) return;
    setIsDirty(true);
    setTestCases((current) => applyBulkRunCaseChanges(current, selectedCaseIds, { status }));
  };

  const handleBulkTags = (tagIds: number[]) => {
    if (selectedCaseIds.length === 0) return;
    const selectedTags = tags.filter((tag) => tagIds.includes(tag.id)).map((tag) => ({ id: tag.id, name: tag.name }));
    setIsDirty(true);
    setTestCases((current) => applyBulkRunCaseChanges(current, selectedCaseIds, { tags: selectedTags }));
    setPendingTags((prev) => {
      const next = new Map(prev);
      selectedCaseIds.forEach((caseId) => next.set(caseId, tagIds));
      return next;
    });
  };

  const onSave = async () => {
    if (isUpdating) return;
    if (!testRun.name.trim()) {
      setIsNameInvalid(true);
      return;
    }
    setIsUpdating(true);
    try {
      await updateRun(tokenContext.token.access_token, testRun);
      const savedRunCases = await updateRunCases(tokenContext.token.access_token, Number(runId), testCases);

      if (pendingAssigneesByCaseId.size > 0) {
        const groupedUpdates = groupRunCaseAssigneeUpdates(savedRunCases, pendingAssigneesByCaseId);
        for (const [userId, ids] of Array.from(groupedUpdates.entries())) {
          await assignRunCases(tokenContext.token.access_token, Number(runId), ids, userId);
        }
        setPendingAssigneesByCaseId(new Map());
      }

      if (pendingTags.size > 0) {
        await Promise.all(
          Array.from(pendingTags.entries()).map(([caseId, tagIds]) =>
            updateCaseTags(tokenContext.token.access_token, caseId, tagIds, projectId)
          )
        );
        setPendingTags(new Map());
      }

      await initTestCases();

      addToast({
        title: 'Success',
        color: 'success',
        description: messages.updatedTestRun,
      });
      setIsDirty(false);
    } catch (error) {
      setIsDirty(true);
      logError('Error saving run:', error);
      addToast({
        title: 'Error',
        color: 'danger',
        description: messages.saveFailed,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // **************************************************************************
  // Filter
  // **************************************************************************
  const [showFilter, setShowFilter] = useState(false);
  const [activeFilterNum, setActiveFilterNum] = useState(0);

  const onFilterChange = async (search: string, status: number[], tag: number[], assignee?: string) => {
    if (isDirty || isUpdating) {
      addToast({
        title: 'Error',
        color: 'danger',
        description: messages.pleaseSave,
      });
      return;
    }

    const resolvedAssignee = assignee === 'me' ? String(tokenContext.token.user?.id ?? '') : (assignee ?? '');

    setSearchFilter(search);
    setStatusFilter(status);
    setTagFilter(tag);
    setAssigneeFilter(assignee ?? '');
    setActiveFilterNum((search ? 1 : 0) + (status.length > 0 ? 1 : 0) + (tag.length > 0 ? 1 : 0) + (assignee ? 1 : 0));
    await initTestCases(search, status.map(String), tag.map(String), resolvedAssignee || undefined);
  };

  return (
    <>
      <div className="border-b-1 dark:border-neutral-700 w-full p-3 flex items-center justify-between">
        <div className="flex items-center">
          <Tooltip content={messages.backToRuns}>
            <Button
              isIconOnly
              aria-label={messages.backToRuns}
              size="sm"
              className="rounded-full bg-neutral-50 dark:bg-neutral-600"
              onPress={() => {
                if (confirmFormNavigation()) router.push(`/projects/${projectId}/runs`, { locale: locale });
              }}
            >
              <ArrowLeft size={16} />
            </Button>
          </Tooltip>
          <h3 className="font-bold ms-2">{testRun.name}</h3>
        </div>
        <div className="flex items-center">
          <Popover placement="bottom" isOpen={showFilter} onOpenChange={(open) => setShowFilter(open)}>
            <Badge
              color="danger"
              content={activeFilterNum}
              isInvisible={activeFilterNum === 0}
              shape="circle"
              placement="top-left"
            >
              <PopoverTrigger>
                <Button
                  startContent={<Filter size={16} />}
                  endContent={<ChevronDown size={16} />}
                  size="sm"
                  variant="bordered"
                  className="me-2"
                >
                  {messages.filter}
                </Button>
              </PopoverTrigger>
            </Badge>
            <PopoverContent>
              <TestRunFilter
                messages={messages}
                testRunCaseStatusMessages={testRunCaseStatusMessages}
                activeSearchFilter={searchFilter}
                activeStatusFilters={statusFilter}
                activeTagFilters={tagFilter}
                activeAssigneeFilter={assigneeFilter}
                projectId={projectId}
                members={members}
                onFilterChange={(newTitleFilter, newStatusFilters, newTagFilters, newAssigneeFilter) => {
                  setShowFilter(false);
                  onFilterChange(newTitleFilter, newStatusFilters, newTagFilters, newAssigneeFilter);
                }}
              />
            </PopoverContent>
          </Popover>
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button
                variant="bordered"
                size="sm"
                className="me-2"
                startContent={<FileDown size={16} />}
                endContent={<ChevronDown size={16} />}
              >
                {messages.export}
              </Button>
            </DropdownTrigger>
            <DropdownMenu disallowEmptySelection aria-label="Export options">
              <DropdownItem
                key="xml"
                startContent={<FileCode size={16} />}
                onPress={() => exportRun(tokenContext.token.access_token, Number(testRun.id), 'xml')}
              >
                xml
              </DropdownItem>
              <DropdownItem
                key="json"
                startContent={<FileJson size={16} />}
                onPress={() => exportRun(tokenContext.token.access_token, Number(testRun.id), 'json')}
              >
                json
              </DropdownItem>
              <DropdownItem
                key="csv"
                startContent={<FileSpreadsheet size={16} />}
                onPress={() => exportRun(tokenContext.token.access_token, Number(testRun.id), 'csv')}
              >
                csv
              </DropdownItem>
              <DropdownItem
                key="xlsx"
                startContent={<FileSpreadsheet size={16} />}
                onPress={() => exportRun(tokenContext.token.access_token, Number(testRun.id), 'xlsx')}
              >
                excel
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
          <Button
            startContent={
              <Badge isInvisible={!isDirty} color="danger" size="sm" content="" shape="circle">
                <Save size={16} />
              </Badge>
            }
            size="sm"
            isDisabled={!isProjectReporter || isUpdating}
            color="primary"
            isLoading={isUpdating}
            onPress={onSave}
          >
            {isUpdating ? messages.updating : messages.update}
          </Button>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl pt-6 px-6 flex-grow">
        <div className="flex">
          <div>
            <div className="w-96 h-72">
              <div className="flex items-center">
                <h4 className="font-bold">{messages.progress}</h4>
                <Tooltip content={messages.refresh}>
                  <Button
                    isIconOnly
                    size="sm"
                    className="rounded-full bg-transparent ms-1"
                    isDisabled={isUpdating}
                    onPress={() => fetchRunAndStatusCount(false)}
                  >
                    <RotateCw size={16} />
                  </Button>
                </Tooltip>
              </div>

              <RunProgressChart
                statusCounts={runStatusCounts}
                testRunCaseStatusMessages={testRunCaseStatusMessages}
                theme={theme}
              />
            </div>
          </div>
          <div className="flex-grow">
            <Input
              size="sm"
              type="text"
              variant="bordered"
              isDisabled={!isProjectReporter || isUpdating}
              label={messages.title}
              value={testRun.name}
              isInvalid={isNameInvalid}
              errorMessage={isNameInvalid ? messages.pleaseEnter : ''}
              onChange={(e) => {
                setIsDirty(true);
                setIsNameInvalid(false);
                setTestRun({ ...testRun, name: e.target.value });
              }}
              className="mt-3"
            />

            <Textarea
              size="sm"
              variant="bordered"
              isDisabled={!isProjectReporter || isUpdating}
              label={messages.description}
              value={testRun.description}
              onValueChange={(changeValue) => {
                setIsDirty(true);
                setTestRun({ ...testRun, description: changeValue });
              }}
              className="mt-3"
            />

            <div>
              <Select
                size="sm"
                variant="bordered"
                isDisabled={!isProjectReporter || isUpdating}
                selectedKeys={[testRunStatus[testRun.state].uid]}
                onSelectionChange={(newSelection) => {
                  if (newSelection !== 'all' && newSelection.size !== 0) {
                    const selectedUid = Array.from(newSelection)[0];
                    const index = testRunStatus.findIndex((template) => template.uid === selectedUid);
                    setIsDirty(true);
                    setTestRun({ ...testRun, state: index });
                  }
                }}
                label={messages.status}
                className="mt-3 max-w-xs"
              >
                {testRunStatus.map((status) => (
                  <SelectItem key={status.uid}>{runStatusMessages[status.uid]}</SelectItem>
                ))}
              </Select>
            </div>
          </div>
        </div>

        <Divider className="my-6" />
        <div className="flex items-center justify-between">
          <h6 className="h-8 font-bold">{messages.selectTestCase}</h6>
          <div className="flex items-center gap-2">
            {(selectedKeys === 'all' || selectedKeys.size > 0) && (
              <BulkCaseActions
                messages={messages}
                testRunCaseStatusMessages={testRunCaseStatusMessages}
                members={members}
                tags={tags}
                selectedCount={selectedCaseIds.length}
                canAssign={isManager && !isUpdating}
                canEditRun={isProjectReporter && !isUpdating}
                canEditTags={isProjectDeveloper && !isUpdating}
                onAssign={handleBulkAssignCases}
                onStatus={handleBulkStatus}
                onTags={handleBulkTags}
              />
            )}
            {selectedCaseIds.length > 0 && (
              <Button
                size="sm"
                variant="bordered"
                isDisabled={!isProjectReporter || isUpdating}
                startContent={<CopyMinus size={16} />}
                onPress={() => handleExcludeCases(selectedCaseIds)}
              >
                {messages.excludeFromRun}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-3 flex rounded-small border-2 dark:border-neutral-700 mb-12">
          <div className="w-3/12 border-r-1 dark:border-neutral-700">
            <Button
              size="sm"
              variant={selectedFolder ? 'light' : 'flat'}
              className="m-2"
              onPress={() => {
                setSelectedFolder(null);
                setSelectedKeys(new Set());
              }}
            >
              {messages.allCases}
            </Button>
            <Tree
              data={runFolders}
              className="w-full"
              indent={16}
              rowHeight={42}
              overscanCount={5}
              paddingTop={20}
              paddingBottom={20}
              padding={20}
              width="100%"
              openByDefault={false}
              disableDrop={true}
              disableDrag={true}
            >
              {({ node, style }: { node: NodeApi<TreeNodeData>; style: React.CSSProperties }) => (
                <TreeItem
                  style={style}
                  isSelected={selectedFolder ? node.data.id === selectedFolder.id : false}
                  onClick={() => {
                    setSelectedKeys(new Set([]));
                    setSelectedFolder(node.data);
                  }}
                  toggleButton={
                    node.data.children && node.data.children.length > 0 ? (
                      <Button
                        size="sm"
                        className="bg-transparent rounded-full h-6 w-6 min-w-4"
                        isIconOnly
                        onPress={() => node.toggle()}
                      >
                        {node.isOpen ? (
                          <ChevronDown size={20} color="#F7C24E" />
                        ) : (
                          <ChevronRight size={20} color="#F7C24E" />
                        )}
                      </Button>
                    ) : null
                  }
                  icon={<Folder size={20} color="#F7C24E" fill="#F7C24E" />}
                  label={node.data.name}
                />
              )}
            </Tree>
          </div>
          <div className="w-9/12">
            <div ref={casesScrollRef} className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TestCaseSelector
                projectId={projectId}
                runId={runId}
                locale={locale}
                cases={filteredTestCases}
                isDisabled={!isProjectReporter || isUpdating}
                isManager={isManager && !isUpdating}
                members={members}
                selectedKeys={selectedKeys}
                onSelectionChange={setSelectedKeys}
                onChangeStatus={handleChangeStatus}
                onExcludeCase={(excludeCaseId) => handleExcludeCases([excludeCaseId])}
                onAssignCase={(caseId, _runCaseId, userId) => handleAssignCase(caseId, userId)}
                onOpenCase={onOpenCase}
                messages={messages}
                testRunCaseStatusMessages={testRunCaseStatusMessages}
                priorityMessages={priorityMessages}
                testTypeMessages={testTypeMessages}
              />
            </div>
            <StickyHorizontalScrollbar targetRef={casesScrollRef} />
          </div>
        </div>
      </div>
    </>
  );
}
