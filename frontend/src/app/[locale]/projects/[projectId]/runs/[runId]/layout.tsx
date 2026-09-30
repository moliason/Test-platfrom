import { useTranslations } from 'next-intl';
import RunWorkspace from './RunWorkspace';
import { RunDetailMessages, RunMessages } from '@/types/run';
import { PriorityMessages } from '@/types/priority';
import { RunStatusMessages, TestRunCaseStatusMessages } from '@/types/status';
import { TestTypeMessages } from '@/types/testType';

export default function RunLayout({
  children,
  params: { projectId, runId, locale },
}: {
  children: React.ReactNode;
  params: { projectId: string; runId: string; locale: string };
}) {
  const t = useTranslations('Run');
  const messages: RunMessages = {
    allCases: t('all_cases'),
    backToRuns: t('back_to_runs'),
    updating: t('updating'),
    update: t('update'),
    updatedTestRun: t('updated_test_run'),
    saveFailed: t('save_failed'),
    export: t('export'),
    progress: t('progress'),
    refresh: t('refresh'),
    id: t('id'),
    title: t('title'),
    pleaseEnter: t('please_enter'),
    description: t('description'),
    priority: t('priority'),
    actions: t('actions'),
    status: t('status'),
    selectTestCase: t('select_test_case'),
    testCaseSelection: t('test_case_selection'),
    includeInRun: t('include_in_run'),
    excludeFromRun: t('exclude_from_run'),
    noCasesFound: t('no_cases_found'),
    areYouSureLeave: t('are_you_sure_leave'),
    type: t('type'),
    testDetail: t('test_detail'),
    steps: t('steps'),
    preconditions: t('preconditions'),
    expectedResult: t('expected_result'),
    detailsOfTheStep: t('details_of_the_step'),
    close: t('close'),
    filter: t('filter'),
    clearAll: t('clear_all'),
    apply: t('apply'),
    selectStatus: t('select_status'),
    pleaseSave: t('please_save'),
    caseTitleOrDescription: t('case_title_or_description'),
    selected: t('selected'),
    tags: t('tags'),
    selectTags: t('select_tags'),
    comments: t('comments'),
    assignee: t('assignee'),
    unassigned: t('unassigned'),
    assignTo: t('assign_to'),
    assignedToMe: t('assigned_to_me'),
    assignSelected: t('assign_selected'),
    filterByAssignee: t('filter_by_assignee'),
    selectAssignee: t('select_assignee'),
    searchAssignee: t('search_assignee'),
  };

  const rst = useTranslations('RunStatus');
  const runStatusMessages: RunStatusMessages = {
    new: rst('new'),
    inProgress: rst('inProgress'),
    underReview: rst('underReview'),
    rejected: rst('rejected'),
    done: rst('done'),
    closed: rst('closed'),
  };

  const rcst = useTranslations('RunCaseStatus');
  const testRunCaseStatusMessages: TestRunCaseStatusMessages = {
    untested: rcst('untested'),
    passed: rcst('passed'),
    failed: rcst('failed'),
    retest: rcst('retest'),
    skipped: rcst('skipped'),
  };

  const pt = useTranslations('Priority');
  const priorityMessages: PriorityMessages = {
    critical: pt('critical'),
    high: pt('high'),
    medium: pt('medium'),
    low: pt('low'),
  };

  const testTypeMessages: TestTypeMessages = {};

  const detailMessages: RunDetailMessages = {
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
    <RunWorkspace
      projectId={projectId}
      runId={runId}
      locale={locale}
      messages={messages}
      detailMessages={detailMessages}
      runStatusMessages={runStatusMessages}
      testRunCaseStatusMessages={testRunCaseStatusMessages}
      priorityMessages={priorityMessages}
      testTypeMessages={testTypeMessages}
      commentMessages={commentMessages}
    >
      {children}
    </RunWorkspace>
  );
}
