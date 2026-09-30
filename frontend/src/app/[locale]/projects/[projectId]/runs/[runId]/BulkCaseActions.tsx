'use client';

import { useState } from 'react';
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Selection,
} from '@heroui/react';
import { ChevronDown } from 'lucide-react';
import AssigneePicker from './AssigneePicker';
import RunCaseStatus from './RunCaseStatus';
import { testRunCaseStatus } from '@/config/selection';
import type { RunMessages } from '@/types/run';
import type { TestRunCaseStatusMessages } from '@/types/status';
import type { MemberType } from '@/types/user';
import type { TagType } from '@/types/tag';

type Props = {
  messages: RunMessages;
  testRunCaseStatusMessages: TestRunCaseStatusMessages;
  members: MemberType[];
  tags: TagType[];
  selectedCount: number;
  canAssign: boolean;
  canEditRun: boolean;
  canEditTags: boolean;
  onAssign: (userId: number | null) => void;
  onStatus: (status: number) => void;
  onTags: (tagIds: number[]) => void;
};

export default function BulkCaseActions({
  messages,
  testRunCaseStatusMessages,
  members,
  tags,
  selectedCount,
  canAssign,
  canEditRun,
  canEditTags,
  onAssign,
  onStatus,
  onTags,
}: Props) {
  const [selectedTagKeys, setSelectedTagKeys] = useState<Selection>(new Set([]));

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {canAssign && (
        <AssigneePicker
          isAvatarOnly={false}
          assigneeUserId={null}
          members={members}
          isDisabled={false}
          unassignedLabel={messages.unassigned}
          searchPlaceholder={messages.searchAssignee}
          triggerLabel={`${messages.assignSelected} (${selectedCount})`}
          onAssign={onAssign}
        />
      )}

      {canEditRun && (
        <Dropdown>
          <DropdownTrigger>
            <Button size="sm" variant="bordered" endContent={<ChevronDown size={14} />}>
              {messages.status}
            </Button>
          </DropdownTrigger>
          <DropdownMenu aria-label={messages.status} onAction={(key) => onStatus(Number(key))}>
            {testRunCaseStatus.map((status, index) => (
              <DropdownItem
                key={String(index)}
                textValue={testRunCaseStatusMessages[status.uid]}
                startContent={<RunCaseStatus uid={status.uid} />}
              >
                {testRunCaseStatusMessages[status.uid]}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>
      )}

      {canEditTags && (
        <Dropdown
          onOpenChange={(open) => {
            if (!open) setSelectedTagKeys(new Set([]));
          }}
        >
          <DropdownTrigger>
            <Button size="sm" variant="bordered" endContent={<ChevronDown size={14} />}>
              {messages.tags}
            </Button>
          </DropdownTrigger>
          <DropdownMenu
            aria-label={messages.tags}
            selectionMode="multiple"
            closeOnSelect={false}
            selectedKeys={selectedTagKeys}
            onSelectionChange={(keys) => {
              setSelectedTagKeys(keys);
              if (keys !== 'all') {
                onTags(Array.from(keys).map((key) => Number(key)));
              }
            }}
            className="max-h-[50vh] overflow-y-auto"
          >
            {tags.map((tag) => (
              <DropdownItem key={String(tag.id)} textValue={tag.name}>
                {tag.name}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>
      )}
    </div>
  );
}
