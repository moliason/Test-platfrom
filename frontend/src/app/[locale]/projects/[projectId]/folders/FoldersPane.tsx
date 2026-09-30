'use client';
import { createContext, useState, useEffect, useContext, useMemo, useRef } from 'react';
import { Button, Checkbox, Spinner } from '@heroui/react';
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen, Plus, RotateCw } from 'lucide-react';
import { Tree, TreeApi, NodeRendererProps } from 'react-arborist';
import { useParams, useSearchParams } from 'next/navigation';
import FolderDialog from './FolderDialog';
import FolderEditMenu from './FolderEditMenu';
import { CaseTreeContext } from './CaseTreeProvider';
import { fetchFolders, createFolder, updateFolder, deleteFolder } from './foldersControl';
import { Link, usePathname, useRouter } from '@/src/i18n/routing';
import { TokenContext } from '@/utils/TokenProvider';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { FolderType, FoldersMessages, TreeNodeData } from '@/types/folder';
import { logError } from '@/utils/errorHandler';
import { buildFolderTree } from '@/utils/buildFolderTree';
import { emitMoveEvent } from '@/utils/testCaseMoveEvent';
import { CaseType } from '@/types/case';
import { highlightSearchTerm } from '@/utils/highlightSearchTerm';

type Props = {
  projectId: string;
  messages: FoldersMessages;
  locale: string;
};

const foldersCache = new Map<string, FolderType[]>();
const FolderTreeActionsContext = createContext<
  | (Props & {
      openDialogForCreate: (folderId?: number | null) => void;
      onEditClick: (folder: FolderType) => void;
      onDeleteClick: (folderId: number) => void;
      handleDragOver: (event: React.DragEvent) => void;
      handleDrop: (event: React.DragEvent, folderId: string) => void;
    })
  | null
>(null);
type CaseTreeNode = Omit<TreeNodeData, 'children'> & {
  children?: CaseTreeNode[];
  caseData?: CaseType;
  placeholder?: boolean;
};

function CaseTreeItem({ node, style }: NodeRendererProps<CaseTreeNode>) {
  const { projectId, messages, locale, openDialogForCreate, onEditClick, onDeleteClick, handleDragOver, handleDrop } =
    useContext(FolderTreeActionsContext)!;
  const context = useContext(TokenContext);
  const { entries, loadCases, selectedIds, setSelectedIds, messages: caseMessages } = useContext(CaseTreeContext)!;
  const params = useParams();
  const folderId = Number(params.folderId);
  const caseId = Number(params.caseId);
  const query = useSearchParams().toString();
  const search = new URLSearchParams(query).get('search') ?? '';
  const testCase = node.data.caseData;
  const folder = node.data.folderData;
  if (node.data.placeholder) {
    const entry = entries[folder.id];
    return (
      <div style={style} className="flex h-full items-center px-3 text-xs text-default-500">
        {entry?.error ? (
          <Button
            size="sm"
            variant="light"
            title={caseMessages.loadError}
            startContent={<RotateCw size={14} />}
            onPress={() => void loadCases(folder.id, true)}
          >
            {caseMessages.retry}
          </Button>
        ) : entry?.cases ? (
          caseMessages.noCasesFound
        ) : (
          <Spinner size="sm" />
        )}
      </div>
    );
  }
  if (testCase) {
    return (
      <div
        style={style}
        className={`flex h-full items-center gap-2 px-2 ${caseId === testCase.id ? 'bg-default-200' : 'hover:bg-default-100'}`}
        data-case-id={testCase.id}
        onClick={(event) => event.stopPropagation()}
        draggable={context.isProjectDeveloper(Number(projectId))}
        onDragStart={(event) => {
          event.stopPropagation();
          const ids = selectedIds.has(testCase.id) ? Array.from(selectedIds) : [testCase.id];
          event.dataTransfer.setData('application/json', JSON.stringify(ids));
          event.dataTransfer.effectAllowed = 'move';
        }}
      >
        <Checkbox
          size="sm"
          aria-label={`${caseMessages.selected} ${testCase.title}`}
          isDisabled={!context.isProjectReporter(Number(projectId))}
          isSelected={selectedIds.has(testCase.id)}
          onValueChange={(selected) => {
            setSelectedIds((current) => {
              const updated = new Set(current);
              if (selected) updated.add(testCase.id);
              else updated.delete(testCase.id);
              return updated;
            });
          }}
        />
        <Link
          href={`/projects/${projectId}/folders/${folder.id}/cases/${testCase.id}${query ? `?${query}` : ''}`}
          locale={locale}
          scroll={false}
          prefetch={false}
          draggable={false}
          aria-current={caseId === testCase.id ? 'page' : undefined}
          title={testCase.title}
          className="flex min-w-0 flex-1 items-center gap-2 text-sm text-foreground"
        >
          <FileText size={15} className="shrink-0 text-default-500" />
          <span className="truncate">{highlightSearchTerm({ text: testCase.title, searchTerm: search })}</span>
        </Link>
      </div>
    );
  }
  return (
    <div
      style={style}
      className={`flex h-full items-center gap-1 px-2 ${folderId === folder.id ? 'bg-default-100' : 'hover:bg-default-100'}`}
      onDragOver={handleDragOver}
      onDrop={(event) => handleDrop(event, node.id)}
    >
      <button
        type="button"
        className="flex h-7 w-6 shrink-0 items-center justify-center"
        aria-label={folder.name}
        aria-expanded={node.isOpen}
        onClick={() => node.toggle()}
      >
        {node.isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      <Link
        className="flex min-w-0 flex-1 items-center gap-2 text-sm text-foreground"
        href={`/projects/${projectId}/folders/${folder.id}/cases${query ? `?${query}` : ''}`}
        locale={locale}
        scroll={false}
        prefetch={false}
        onClick={() => node.open()}
        title={folder.name}
      >
        {node.isOpen ? (
          <FolderOpen size={18} className="shrink-0 text-amber-500" />
        ) : (
          <Folder size={18} className="shrink-0 text-amber-500" />
        )}
        <span className="truncate">{folder.name}</span>
        {entries[folder.id]?.cases && (
          <span className="text-xs text-default-500">{entries[folder.id].cases!.length}</span>
        )}
      </Link>
      <Button
        size="sm"
        isIconOnly
        variant="light"
        aria-label={messages.newFolder}
        title={messages.newFolder}
        isDisabled={!context.isProjectDeveloper(Number(projectId))}
        onPress={() => openDialogForCreate(folder.id)}
      >
        <Plus size={16} />
      </Button>
      <FolderEditMenu
        folder={folder}
        isDisabled={!context.isProjectDeveloper(Number(projectId))}
        onEditClick={onEditClick}
        onDeleteClick={onDeleteClick}
        messages={messages}
      />
    </div>
  );
}

export default function FoldersPane({ projectId, messages, locale }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const context = useContext(TokenContext);
  const isSignedIn = context.isSignedIn();
  const accessToken = context.token.access_token;
  const cacheKey = `${accessToken}:${projectId}`;
  const cachedFolders = foldersCache.get(cacheKey) ?? [];
  const [folders, setFolders] = useState<FolderType[]>(cachedFolders);
  const { folderId: routeFolderId } = useParams();
  const folderId = Number(routeFolderId);
  const { entries, loadCases, setSelectedIds } = useContext(CaseTreeContext)!;
  const treeRef = useRef<TreeApi<CaseTreeNode>>(null);
  const treeContainer = useRef<HTMLDivElement>(null);
  const [treeHeight, setTreeHeight] = useState(600);
  const treeData = useMemo(() => {
    const addCases = (nodes: TreeNodeData[]): CaseTreeNode[] =>
      nodes.map((node) => ({
        ...node,
        children: [
          ...addCases(node.children ?? []),
          ...(entries[Number(node.id)]?.cases?.map((testCase) => ({
            ...node,
            id: `case-${testCase.id}`,
            name: testCase.title,
            children: undefined,
            caseData: testCase,
          })) ?? []),
          ...(!entries[Number(node.id)]?.cases?.length
            ? [
                {
                  ...node,
                  id: `placeholder-${node.id}`,
                  children: undefined,
                  placeholder: true,
                },
              ]
            : []),
        ],
      }));
    return addCases(buildFolderTree(folders));
  }, [folders, entries]);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [parentFolderId, setParentFolderId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchDataEffect() {
      if (!isSignedIn) {
        return;
      }
      try {
        const fetchedFolders: FolderType[] = await fetchFolders(accessToken, Number(projectId));
        foldersCache.set(cacheKey, fetchedFolders);
        setFolders(fetchedFolders);
      } catch (error: unknown) {
        logError('Error fetching folders:', error);
      }
    }

    fetchDataEffect();
  }, [accessToken, cacheKey, isSignedIn, projectId]);

  useEffect(() => {
    if (!treeContainer.current) return;
    const observer = new ResizeObserver(([entry]) => setTreeHeight(Math.max(100, entry.contentRect.height)));
    observer.observe(treeContainer.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!folders.some((folder) => folder.id === folderId)) return;
    treeRef.current?.openParents(String(folderId));
    treeRef.current?.open(String(folderId));
    void loadCases(folderId);
  }, [folderId, folders, loadCases]);

  useEffect(() => {
    for (const folder of folders) {
      if (treeRef.current?.isOpen(String(folder.id))) void loadCases(folder.id);
    }
  }, [folders, loadCases]);

  useEffect(() => {
    if (folders.length === 0) return;

    if (pathname === `/projects/${projectId}/folders`) {
      const smallestFolderId = Math.min(...folders.map((folder) => folder.id));
      router.replace(`/projects/${projectId}/folders/${smallestFolderId}/cases`, { locale, scroll: false });
    }
  }, [folderId, folders, locale, pathname, projectId, router]);

  const openDialogForCreate = (folderId: number | null = null) => {
    setParentFolderId(folderId);
    setIsFolderDialogOpen(true);
    setEditingFolder(null);
  };

  const closeDialog = () => {
    setIsFolderDialogOpen(false);
    setEditingFolder(null);
    setParentFolderId(null);
  };

  const onSubmit = async (name: string, detail: string) => {
    if (editingFolder) {
      await updateFolder(accessToken, editingFolder.id, name, detail, projectId, parentFolderId);
    } else {
      await createFolder(accessToken, name, detail, projectId, parentFolderId);
    }
    const fetchedFolders: FolderType[] = await fetchFolders(accessToken, Number(projectId));
    foldersCache.set(cacheKey, fetchedFolders);
    setFolders(fetchedFolders);
    closeDialog();
  };

  const onEditClick = (folder: FolderType) => {
    setEditingFolder(folder);
    setParentFolderId(folder.parentFolderId);
    setIsFolderDialogOpen(true);
  };

  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] = useState(false);
  const [deleteFolderId, setDeleteFolderId] = useState<number | null>(null);

  const closeDeleteConfirmDialog = () => {
    setIsDeleteConfirmDialogOpen(false);
    setDeleteFolderId(null);
  };

  const onDeleteClick = (deleteFolderId: number) => {
    setDeleteFolderId(deleteFolderId);
    setIsDeleteConfirmDialogOpen(true);
  };

  const onConfirm = async () => {
    if (deleteFolderId) {
      await deleteFolder(accessToken, deleteFolderId);
      setSelectedIds(new Set());
      const fetchedFolders: FolderType[] = await fetchFolders(accessToken, Number(projectId));
      foldersCache.set(cacheKey, fetchedFolders);
      setFolders(fetchedFolders);
      router.push(`/projects/${projectId}/folders`, { locale });
      closeDeleteConfirmDialog();
    }
  };

  // **************************************************************************
  // move test case
  // **************************************************************************
  const handleDragOver = (e: React.DragEvent) => {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropFolderId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!context.isProjectDeveloper(Number(projectId))) return;
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    try {
      const ids = JSON.parse(data);
      if (Array.isArray(ids) && ids.every(Number.isInteger)) emitMoveEvent(ids, Number(dropFolderId));
    } catch (error) {
      logError('Invalid case drag data', error);
    }
  };

  return (
    <FolderTreeActionsContext.Provider
      value={{
        projectId,
        messages,
        locale,
        openDialogForCreate,
        onEditClick,
        onDeleteClick,
        handleDragOver,
        handleDrop,
      }}
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden border-r-1 dark:border-neutral-700" data-case-tree>
        <div className="flex shrink-0 items-center border-b border-divider">
          <Button
            startContent={<Plus size={16} />}
            size="sm"
            variant="bordered"
            className="m-2"
            isDisabled={!context.isProjectDeveloper(Number(projectId))}
            onPress={() => openDialogForCreate()}
          >
            {messages.newFolder}
          </Button>
        </div>
        <div ref={treeContainer} className="min-h-0 flex-1">
          {treeData.length > 0 && (
            <Tree
              ref={treeRef}
              data={treeData}
              className="w-full"
              indent={16}
              rowHeight={36}
              height={treeHeight}
              overscanCount={8}
              paddingTop={4}
              paddingBottom={4}
              width="100%"
              openByDefault={false}
              disableDrop={true}
              disableDrag={true}
              disableEdit={true}
              onToggle={(id) => {
                if (treeRef.current?.isOpen(id)) void loadCases(Number(id));
              }}
            >
              {CaseTreeItem}
            </Tree>
          )}
        </div>
      </div>

      <FolderDialog
        isOpen={isFolderDialogOpen}
        editingFolder={editingFolder}
        onCancel={closeDialog}
        onSubmit={onSubmit}
        messages={messages}
      />

      <DeleteConfirmDialog
        isOpen={isDeleteConfirmDialogOpen}
        onCancel={closeDeleteConfirmDialog}
        onConfirm={onConfirm}
        closeText={messages.close}
        confirmText={messages.areYouSure}
        deleteText={messages.delete}
      />
    </FolderTreeActionsContext.Provider>
  );
}
