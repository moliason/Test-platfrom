'use client';
import { useState, useEffect } from 'react';
import { Button, Input, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { RunType, RunsMessages } from '@/types/run';

type Props = {
  isOpen: boolean;
  editingRun: RunType | null;
  onCancel: () => void;
  onSubmit: (name: string, description: string) => void;
  messages: Pick<RunsMessages, 'run' | 'runName' | 'runDescription' | 'close' | 'create' | 'update' | 'pleaseEnter'>;
  isSubmitting?: boolean;
};

export default function RunDialog({ isOpen, editingRun, onCancel, onSubmit, messages, isSubmitting = false }: Props) {
  const [runName, setRunName] = useState({
    text: editingRun ? editingRun.name : '',
    isInvalid: false,
    errorMessage: '',
  });

  const [runDescription, setRunDescription] = useState({
    text: editingRun ? editingRun.description : '',
    isInvalid: false,
    errorMessage: '',
  });

  useEffect(() => {
    setRunName({ text: editingRun?.name ?? '', isInvalid: false, errorMessage: '' });
    setRunDescription({ text: editingRun?.description ?? '', isInvalid: false, errorMessage: '' });
  }, [editingRun, isOpen]);

  const validate = () => {
    if (isSubmitting) return;
    if (!runName.text.trim()) {
      setRunName({
        text: '',
        isInvalid: true,
        errorMessage: messages.pleaseEnter,
      });

      return;
    }

    onSubmit(runName.text.trim(), runDescription.text);
  };

  return (
    <Modal
      isOpen={isOpen}
      isDismissable={!isSubmitting}
      isKeyboardDismissDisabled={isSubmitting}
      hideCloseButton={isSubmitting}
      onOpenChange={() => {
        if (!isSubmitting) onCancel();
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">{messages.run}</ModalHeader>
        <ModalBody>
          <Input
            type="text"
            label={messages.runName}
            value={runName.text}
            isInvalid={runName.isInvalid}
            errorMessage={runName.errorMessage}
            onChange={(e) => {
              setRunName({
                text: e.target.value,
                isInvalid: false,
                errorMessage: '',
              });
            }}
          />
          <Textarea
            label={messages.runDescription}
            value={runDescription.text}
            isInvalid={runDescription.isInvalid}
            errorMessage={runDescription.errorMessage}
            onChange={(e) => {
              setRunDescription({
                ...runDescription,
                text: e.target.value,
              });
            }}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onCancel} isDisabled={isSubmitting}>
            {messages.close}
          </Button>
          <Button color="primary" onPress={validate} isLoading={isSubmitting}>
            {editingRun && editingRun.createdAt ? messages.update : messages.create}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
