import { useTranslations } from 'next-intl';
import DetailPane from './DetailPane';
import type { RunDetailMessages } from '@/types/run';
import type { PriorityMessages } from '@/types/priority';
import type { TestTypeMessages } from '@/types/testType';

export default function Page({
  params,
}: {
  params: { projectId: string; runId: string; caseId: string; locale: string };
}) {
  const t = useTranslations('Run');
  const messages: RunDetailMessages = {
    title: t('title'),
    description: t('description'),
    priority: t('priority'),
    type: t('type'),
    tags: t('tags'),
    testDetail: t('test_detail'),
    steps: t('steps'),
    preconditions: t('preconditions'),
    expectedResult: t('expected_result'),
    detailsOfTheStep: t('details_of_the_step'),
    caseDetail: t('case_detail'),
    comments: t('comments'),
    history: t('history'),
  };

  const pt = useTranslations('Priority');
  const priorityMessages: PriorityMessages = {
    critical: pt('critical'),
    high: pt('high'),
    medium: pt('medium'),
    low: pt('low'),
  };

  const testTypeMessages: TestTypeMessages = {};

  const ct = useTranslations('Comments');
  const commentMessages = {
    comments: ct('comments'),
    noComments: ct('no_comments'),
    addComment: ct('add_comment'),
    save: ct('save'),
    cancel: ct('cancel'),
    placeholder: ct('placeholder'),
    notIncludedInRun: ct('not_included_in_run'),
    commentAdded: ct('comment_added'),
    failedToAddComment: ct('failed_to_add_comment'),
    commentUpdated: ct('comment_updated'),
    failedToUpdateComment: ct('failed_to_update_comment'),
    commentDeleted: ct('comment_deleted'),
    failedToDeleteComment: ct('failed_to_delete_comment'),
  };

  return (
    <DetailPane
      projectId={params.projectId}
      runId={params.runId}
      caseId={params.caseId}
      locale={params.locale}
      messages={messages}
      priorityMessages={priorityMessages}
      testTypeMessages={testTypeMessages}
      commentMessages={commentMessages}
    />
  );
}
