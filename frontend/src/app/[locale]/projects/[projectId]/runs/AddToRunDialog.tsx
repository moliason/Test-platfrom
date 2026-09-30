'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@heroui/react';
import { RotateCw } from 'lucide-react';
import { fetchRuns } from './runsControl';
import { RunType } from '@/types/run';
import { CasesMessages } from '@/types/case';

type Props = {
  isOpen: boolean;
  isSubmitting: boolean;
  projectId: number;
  token: string;
  messages: Pick<CasesMessages, 'addToRun' | 'selectRun' | 'noRunsAvailable' | 'loadRunsFailed' | 'retry' | 'close'>;
  onCancel: () => void;
  onSubmit: (runId: number) => void;
};

export default function AddToRunDialog({
  isOpen,
  isSubmitting,
  projectId,
  token,
  messages,
  onCancel,
  onSubmit,
}: Props) {
  const [runs, setRuns] = useState<RunType[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retry, setRetry] = useState(0);
  // Keep the nested listbox inside the modal's focus and visibility boundary.
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setSelectedRunId(null);
    setRuns([]);
    setIsLoading(true);
    setHasError(false);
    void fetchRuns(token, projectId).then((data: RunType[] | undefined) => {
      if (cancelled) return;
      if (data) setRuns(data);
      else setHasError(true);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, projectId, token, retry]);

  return (
    <Modal
      ref={modalRef}
      isOpen={isOpen}
      isDismissable={!isSubmitting}
      isKeyboardDismissDisabled={isSubmitting}
      hideCloseButton={isSubmitting}
      onOpenChange={() => {
        if (!isSubmitting) onCancel();
      }}
    >
      <ModalContent>
        <ModalHeader>{messages.addToRun}</ModalHeader>
        <ModalBody>
          <Autocomplete
            label={messages.selectRun}
            defaultItems={runs}
            selectedKey={selectedRunId === null ? null : String(selectedRunId)}
            onSelectionChange={(key) => setSelectedRunId(key === null ? null : Number(key))}
            isLoading={isLoading}
            isDisabled={isSubmitting || isLoading || hasError || !runs.length}
            listboxProps={{ emptyContent: messages.noRunsAvailable }}
            popoverProps={{ portalContainer: modalRef.current ?? undefined }}
          >
            {(run) => (
              <AutocompleteItem key={String(run.id)} textValue={`${run.name} (#${run.id})`}>
                {run.name} (#{run.id})
              </AutocompleteItem>
            )}
          </Autocomplete>
          {hasError ? (
            <div className="flex items-center justify-between gap-2 text-sm text-danger" role="alert">
              {messages.loadRunsFailed}
              <Button
                size="sm"
                variant="light"
                startContent={<RotateCw size={16} />}
                onPress={() => setRetry((value) => value + 1)}
              >
                {messages.retry}
              </Button>
            </div>
          ) : !isLoading && !runs.length ? (
            <p className="text-sm text-default-500">{messages.noRunsAvailable}</p>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" isDisabled={isSubmitting} onPress={onCancel}>
            {messages.close}
          </Button>
          <Button
            color="primary"
            isLoading={isSubmitting}
            isDisabled={isLoading || hasError || selectedRunId === null || isSubmitting}
            onPress={() => {
              if (selectedRunId !== null && !isSubmitting) onSubmit(selectedRunId);
            }}
          >
            {messages.addToRun}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
