'use client';
import { useEffect, useState, useContext } from 'react';
import { Button } from '@heroui/react';
import { Play } from 'lucide-react';
import RunsTable from './RunsTable';
import { fetchRuns, deleteRun } from './runsControl';
import { RunType, RunsMessages } from '@/types/run';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { TokenContext } from '@/utils/TokenProvider';
import { LocaleCodeType } from '@/types/locale';
import { logError } from '@/utils/errorHandler';
import { useRouter } from '@/src/i18n/routing';

type Props = {
  projectId: string;
  locale: LocaleCodeType;
  messages: RunsMessages;
};

export default function RunsPage({ projectId, locale, messages }: Props) {
  const context = useContext(TokenContext);
  const [runs, setRuns] = useState<RunType[]>([]);

  const router = useRouter();

  // delete confirm dialog
  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] = useState(false);
  const [deleteRunId, setDeleteRunId] = useState<number | null>(null);
  const closeDeleteConfirmDialog = () => {
    setIsDeleteConfirmDialogOpen(false);
    setDeleteRunId(null);
  };

  useEffect(() => {
    async function fetchDataEffect() {
      if (!context.isSignedIn()) {
        return;
      }

      try {
        const data = await fetchRuns(context.token.access_token, Number(projectId));
        setRuns(data);
      } catch (error: unknown) {
        logError('Error fetching runs', error);
      }
    }

    fetchDataEffect();
  }, [context, projectId]);

  const onDeleteClick = (runId: number) => {
    setDeleteRunId(runId);
    setIsDeleteConfirmDialogOpen(true);
  };

  const onConfirm = async () => {
    if (deleteRunId) {
      await deleteRun(context.token.access_token, deleteRunId);
      setRuns(runs.filter((run) => run.id !== deleteRunId));
      closeDeleteConfirmDialog();
    }
  };

  return (
    <div className="container mx-auto max-w-3xl pt-6 px-6 flex-grow">
      <div className="w-full p-3 flex items-center justify-between">
        <h3 className="font-bold">{messages.runList}</h3>
        <div>
          <Button
            startContent={<Play size={16} />}
            size="sm"
            isDisabled={!context.isProjectReporter(Number(projectId))}
            color="primary"
            onPress={() => router.push(`/projects/${projectId}/folders`, { locale })}
          >
            {messages.newRun}
          </Button>
        </div>
      </div>

      <RunsTable
        projectId={projectId}
        isDisabled={!context.isProjectReporter(Number(projectId))}
        runs={runs}
        onDeleteRun={onDeleteClick}
        messages={messages}
        locale={locale}
      />

      <DeleteConfirmDialog
        isOpen={isDeleteConfirmDialogOpen}
        onCancel={closeDeleteConfirmDialog}
        onConfirm={onConfirm}
        closeText={messages.close}
        confirmText={messages.areYouSure}
        deleteText={messages.delete}
      />
    </div>
  );
}
