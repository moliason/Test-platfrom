'use client';

import { useState } from 'react';
import RunEditor from './RunEditor';
import DetailPane from './cases/[caseId]/DetailPane';
import ResizablePanes from '@/components/ResizablePane';
import type { RunDetailMessages, RunDetailTab, RunMessages } from '@/types/run';
import type { PriorityMessages } from '@/types/priority';
import type { RunStatusMessages, TestRunCaseStatusMessages } from '@/types/status';
import type { TestTypeMessages } from '@/types/testType';
import type { CommentMessages } from '@/types/comment';

type Props = {
  children: React.ReactNode;
  projectId: string;
  runId: string;
  locale: string;
  messages: RunMessages;
  detailMessages: RunDetailMessages;
  runStatusMessages: RunStatusMessages;
  testRunCaseStatusMessages: TestRunCaseStatusMessages;
  priorityMessages: PriorityMessages;
  testTypeMessages: TestTypeMessages;
  commentMessages: CommentMessages;
};

export default function RunWorkspace({
  children,
  projectId,
  runId,
  locale,
  messages,
  detailMessages,
  runStatusMessages,
  testRunCaseStatusMessages,
  priorityMessages,
  testTypeMessages,
  commentMessages,
}: Props) {
  const [detailSelection, setDetailSelection] = useState<{ caseId: number; tab: RunDetailTab } | null>(null);

  return (
    <ResizablePanes
      stickyRightPane
      leftPane={
        <RunEditor
          projectId={projectId}
          runId={runId}
          messages={messages}
          runStatusMessages={runStatusMessages}
          testRunCaseStatusMessages={testRunCaseStatusMessages}
          priorityMessages={priorityMessages}
          testTypeMessages={testTypeMessages}
          locale={locale}
          onOpenCase={(caseId, tab) => setDetailSelection({ caseId, tab })}
        />
      }
      rightPane={
        detailSelection ? (
          <DetailPane
            key={`${detailSelection.caseId}-${detailSelection.tab}`}
            projectId={projectId}
            runId={runId}
            caseId={String(detailSelection.caseId)}
            locale={locale}
            initialTab={detailSelection.tab}
            messages={detailMessages}
            priorityMessages={priorityMessages}
            testTypeMessages={testTypeMessages}
            commentMessages={commentMessages}
          />
        ) : (
          children
        )
      }
    />
  );
}
