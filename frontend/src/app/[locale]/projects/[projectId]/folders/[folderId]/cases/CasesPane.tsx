'use client';
import { useState, useEffect, useContext, useCallback, ComponentProps } from 'react';
import {
  addToast,
  Badge,
  Button,
  Checkbox,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@heroui/react';
import {
  ChevronDown,
  FileDown,
  FileJson,
  FileSpreadsheet,
  FileUp,
  Filter,
  Plus,
  Trash,
  Play,
  ListPlus,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import TestCaseFilter from './TestCaseFilter';
import { CaseTreeContext } from '../../CaseTreeProvider';
import CaseDialog from './CaseDialog';
import CaseMoveDialog from './CaseMoveDialog';
import CaseImportDialog from './CaseImportDialog';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { TokenContext } from '@/utils/TokenProvider';
import { createCase, deleteCases, exportCases } from '@/utils/caseControl';
import { CasesMessages } from '@/types/case';
import { PriorityMessages } from '@/types/priority';
import { TestTypeMessages } from '@/types/testType';
import { LocaleCodeType } from '@/types/locale';
import { parseQueryParam } from '@/utils/parseQueryParam';
import { onMoveEvent } from '@/utils/testCaseMoveEvent';
import RunDialog from '../../../runs/RunDialog';
import AddToRunDialog from '../../../runs/AddToRunDialog';
import { createRun, addCasesToRun } from '../../../runs/runsControl';
import { logError } from '@/utils/errorHandler';

type Props = {
  projectId: string;
  folderId: string;
  messages: CasesMessages;
  priorityMessages: PriorityMessages;
  testTypeMessages: TestTypeMessages;
  locale: LocaleCodeType;
  runDialogMessages: ComponentProps<typeof RunDialog>['messages'];
};

export default function CasesPane({
  projectId,
  folderId,
  messages,
  priorityMessages,
  testTypeMessages,
  locale,
  runDialogMessages,
}: Props) {
  const context = useContext(TokenContext);
  const router = useRouter();
  const searchParamsString = useSearchParams().toString();
  const accessToken = context.token.access_token;
  const { entries, loadCases, refreshCases, selectedIds, setSelectedIds } = useContext(CaseTreeContext)!;
  const cases = entries[Number(folderId)]?.cases ?? [];
  const isDisabled = !context.isProjectDeveloper(Number(projectId));
  const [showFilter, setShowFilter] = useState(false);
  const [isCaseDialogOpen, setIsCaseDialogOpen] = useState(false);
  const params = new URLSearchParams(searchParamsString);
  const searchFilter = params.get('search') ?? '';
  const priorityFilter = parseQueryParam(params.get('priority'));
  const typeFilter = parseQueryParam(params.get('type'));
  const tagFilter = parseQueryParam(params.get('tag'));
  const activeFilterNum = Number(Boolean(searchFilter)) + priorityFilter.length + typeFilter.length + tagFilter.length;
  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] = useState(false);
  const [deleteCaseIds, setDeleteCaseIds] = useState<number[]>([]);
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
  const [isCreatingRun, setIsCreatingRun] = useState(false);
  const [isAddToRunDialogOpen, setIsAddToRunDialogOpen] = useState(false);
  const [isAddingToRun, setIsAddingToRun] = useState(false);

  const updateUrlParams = (updates: { search?: string; priority?: number[]; type?: number[]; tag?: number[] }) => {
    const currentParams = new URLSearchParams(searchParamsString);

    if (updates.search) {
      currentParams.set('search', updates.search);
    } else {
      currentParams.delete('search');
    }

    if (updates.priority && updates.priority.length > 0) {
      currentParams.set('priority', updates.priority.join(','));
    } else {
      currentParams.delete('priority');
    }

    if (updates.type && updates.type.length > 0) {
      currentParams.set('type', updates.type.join(','));
    } else {
      currentParams.delete('type');
    }

    if (updates.tag && updates.tag.length > 0) {
      currentParams.set('tag', updates.tag.join(','));
    } else {
      currentParams.delete('tag');
    }

    const newUrl = `/${locale}/projects/${projectId}/folders/${folderId}/cases?${currentParams.toString()}`;
    router.push(newUrl, { scroll: false });
  };

  useEffect(() => {
    void loadCases(Number(folderId));
  }, [folderId, loadCases]);

  const closeDialog = () => setIsCaseDialogOpen(false);

  const onSubmit = async (title: string, description: string, createMore: boolean) => {
    const newCase = await createCase(accessToken, folderId, title, description);
    if (!newCase) return;
    await refreshCases();
    if (!createMore) {
      closeDialog();
      router.push(`/${locale}/projects/${projectId}/folders/${folderId}/cases/${newCase.id}`, { scroll: false });
    }
  };

  const closeDeleteConfirmDialog = () => {
    setIsDeleteConfirmDialogOpen(false);
    setDeleteCaseIds([]);
  };

  const onDeleteCases = (deleteCaseIds: number[]) => {
    setDeleteCaseIds(deleteCaseIds);
    setIsDeleteConfirmDialogOpen(true);
  };

  const onConfirm = async () => {
    if (deleteCaseIds.length > 0) {
      await deleteCases(accessToken, deleteCaseIds, Number(projectId));
      setSelectedIds(new Set());
      await refreshCases();
      const currentCaseId = Number(window.location.pathname.split('/cases/')[1]);
      if (deleteCaseIds.includes(currentCaseId)) {
        router.replace(
          `/${locale}/projects/${projectId}/folders/${folderId}/cases${searchParamsString ? `?${searchParamsString}` : ''}`,
          { scroll: false }
        );
      }
      closeDeleteConfirmDialog();
    }
  };

  const onExportCases = async (type: string) => {
    await exportCases(accessToken, Number(folderId), type);
  };

  const handleFilterChange = (search: string, priorities: number[], types: number[], tag: number[]) => {
    setShowFilter(false);
    updateUrlParams({ search: search, priority: priorities, type: types, tag: tag });
  };

  // **************************************************************************
  // Move/Clone cases
  // **************************************************************************
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState<number[]>([]);
  const [targetFolderId, setTargetFolderId] = useState<number | undefined>(undefined);
  const openMoveDialog = useCallback((caseIds: number[], folderId?: number) => {
    setSelectedCaseIds(caseIds);
    setTargetFolderId(folderId);
    setIsMoveDialogOpen(true);
  }, []);

  const handleMoved = async () => {
    await refreshCases();
    setSelectedIds(new Set());
    router.replace(`/${locale}/projects/${projectId}/folders/${folderId}/cases`, { scroll: false });
  };

  useEffect(() => {
    const unsubscribe = onMoveEvent(async (e) => {
      const { testCaseIds, targetFolderId } = e.detail;
      openMoveDialog(testCaseIds, targetFolderId);
    });
    return unsubscribe;
  }, [openMoveDialog]);

  // **************************************************************************
  // Import cases
  // **************************************************************************
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const handleImport = () => {
    refreshCases();
    setIsImportDialogOpen(false);
    addToast({
      title: 'Success',
      color: 'success',
      description: messages.casesImported,
    });
  };

  return (
    <>
      <div
        className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-divider p-3"
        data-case-toolbar
      >
        <div className="flex min-w-0 items-center gap-2">
          <Checkbox
            size="sm"
            aria-label={messages.selected}
            isDisabled={!context.isProjectReporter(Number(projectId)) || !cases.length}
            isSelected={cases.length > 0 && cases.every((testCase) => selectedIds.has(testCase.id))}
            isIndeterminate={
              cases.some((testCase) => selectedIds.has(testCase.id)) &&
              !cases.every((testCase) => selectedIds.has(testCase.id))
            }
            onValueChange={(checked) =>
              setSelectedIds((current) => {
                const next = new Set(current);
                cases.forEach((testCase) => {
                  if (checked) next.add(testCase.id);
                  else next.delete(testCase.id);
                });
                return next;
              })
            }
          />
          <span className="text-sm">
            {selectedIds.size
              ? `${selectedIds.size} ${messages.casesSelected}`
              : `${messages.testCaseList} (${cases.length})`}
          </span>
          {selectedIds.size > 0 && (
            <Button
              isIconOnly
              title={messages.delete}
              aria-label={messages.delete}
              size="sm"
              variant="light"
              color="danger"
              isDisabled={isDisabled}
              onPress={() => onDeleteCases(Array.from(selectedIds))}
            >
              <Trash size={16} />
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="bordered"
            startContent={<Play size={16} />}
            isDisabled={!context.isProjectReporter(Number(projectId)) || selectedIds.size === 0 || isCreatingRun}
            onPress={() => setIsRunDialogOpen(true)}
          >
            {messages.createRun}
          </Button>
          <Button
            size="sm"
            variant="bordered"
            startContent={<ListPlus size={16} />}
            isDisabled={!context.isProjectReporter(Number(projectId)) || selectedIds.size === 0 || isAddingToRun}
            onPress={() => setIsAddToRunDialogOpen(true)}
          >
            {messages.addToRun}
          </Button>
          <Popover placement="bottom" isOpen={showFilter} onOpenChange={setShowFilter}>
            <Badge content={activeFilterNum} isInvisible={!activeFilterNum} color="danger">
              <PopoverTrigger>
                <Button size="sm" variant="bordered" startContent={<Filter size={16} />}>
                  {messages.filter}
                </Button>
              </PopoverTrigger>
            </Badge>
            <PopoverContent>
              <TestCaseFilter
                projectId={projectId}
                messages={messages}
                priorityMessages={priorityMessages}
                testTypeMessages={testTypeMessages}
                activeSearchFilter={searchFilter}
                activePriorityFilters={priorityFilter}
                activeTypeFilters={typeFilter}
                activeTagFilters={tagFilter}
                onFilterChange={handleFilterChange}
              />
            </PopoverContent>
          </Popover>
          <Dropdown>
            <DropdownTrigger>
              <Button
                size="sm"
                variant="bordered"
                startContent={<FileDown size={16} />}
                endContent={<ChevronDown size={16} />}
              >
                {messages.export}
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label={messages.export}>
              <DropdownItem key="json" startContent={<FileJson size={16} />} onPress={() => onExportCases('json')}>
                json
              </DropdownItem>
              <DropdownItem key="csv" startContent={<FileSpreadsheet size={16} />} onPress={() => onExportCases('csv')}>
                csv
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
          <Button
            size="sm"
            variant="bordered"
            startContent={<FileUp size={16} />}
            isDisabled={isDisabled}
            onPress={() => setIsImportDialogOpen(true)}
          >
            {messages.import}
          </Button>
          <Button
            size="sm"
            color="primary"
            startContent={<Plus size={16} />}
            isDisabled={isDisabled}
            onPress={() => setIsCaseDialogOpen(true)}
          >
            {messages.newTestCase}
          </Button>
        </div>
      </div>

      <CaseDialog isOpen={isCaseDialogOpen} onCancel={closeDialog} onSubmit={onSubmit} messages={messages} />
      <RunDialog
        isOpen={isRunDialogOpen}
        editingRun={null}
        isSubmitting={isCreatingRun}
        messages={runDialogMessages}
        onCancel={() => setIsRunDialogOpen(false)}
        onSubmit={async (name, description) => {
          if (isCreatingRun || !selectedIds.size || !context.isProjectReporter(Number(projectId))) return;
          setIsCreatingRun(true);
          try {
            const run = await createRun(accessToken, Number(projectId), name, description, Array.from(selectedIds));
            setIsRunDialogOpen(false);
            setSelectedIds(new Set());
            router.push(`/${locale}/projects/${projectId}/runs/${run.id}`, { scroll: false });
          } catch (error) {
            logError('Error creating run from selected cases', error);
            addToast({ title: messages.createRun, description: messages.createRunFailed, color: 'danger' });
          } finally {
            setIsCreatingRun(false);
          }
        }}
      />

      <AddToRunDialog
        isOpen={isAddToRunDialogOpen}
        isSubmitting={isAddingToRun}
        projectId={Number(projectId)}
        token={accessToken}
        messages={messages}
        onCancel={() => setIsAddToRunDialogOpen(false)}
        onSubmit={async (runId) => {
          if (isAddingToRun || !selectedIds.size || !context.isProjectReporter(Number(projectId))) return;
          setIsAddingToRun(true);
          try {
            await addCasesToRun(accessToken, runId, Array.from(selectedIds));
            setIsAddToRunDialogOpen(false);
            setSelectedIds(new Set());
            router.push(`/${locale}/projects/${projectId}/runs/${runId}`, { scroll: false });
          } catch (error) {
            logError('Error adding selected cases to run', error);
            addToast({ title: messages.addToRun, description: messages.addToRunFailed, color: 'danger' });
          } finally {
            setIsAddingToRun(false);
          }
        }}
      />

      <CaseMoveDialog
        isOpen={isMoveDialogOpen}
        testCaseIds={selectedCaseIds}
        projectId={projectId}
        targetFolderId={targetFolderId}
        isDisabled={!context.isProjectDeveloper(Number(projectId))}
        onCancel={() => setIsMoveDialogOpen(false)}
        onMoved={handleMoved}
        onCloned={() => void refreshCases()}
        messages={messages}
        token={accessToken}
      />

      <CaseImportDialog
        isOpen={isImportDialogOpen}
        folderId={Number(folderId)}
        isDisabled={!context.isProjectDeveloper(Number(projectId))}
        onImport={handleImport}
        onCancel={() => setIsImportDialogOpen(false)}
        messages={messages}
        token={accessToken}
      />

      <DeleteConfirmDialog
        isOpen={isDeleteConfirmDialogOpen}
        onCancel={closeDeleteConfirmDialog}
        onConfirm={onConfirm}
        closeText={messages.close}
        confirmText={messages.areYouSure}
        deleteText={messages.delete}
      />
    </>
  );
}
