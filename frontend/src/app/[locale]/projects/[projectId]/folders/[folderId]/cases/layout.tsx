import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import CasesWorkspace from './CasesWorkspace';
import { PriorityMessages } from '@/types/priority';
import { TestTypeMessages } from '@/types/testType';
import { LocaleCodeType } from '@/types/locale';

export default function CasesLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { projectId: string; folderId: string; locale: string };
}) {
  const t = useTranslations('Cases');
  const runs = useTranslations('Runs');
  const messages = {
    createRun: t('create_run'),
    createRunFailed: t('create_run_failed'),
    addToRun: t('add_to_run'),
    selectRun: t('select_run'),
    noRunsAvailable: t('no_runs_available'),
    loadRunsFailed: t('load_runs_failed'),
    addToRunFailed: t('add_to_run_failed'),
    retry: t('retry'),
    testCaseList: t('test_case_list'),
    id: t('id'),
    title: t('title'),
    priority: t('priority'),
    actions: t('actions'),
    deleteCase: t('delete_case'),
    delete: t('delete'),
    close: t('close'),
    areYouSure: t('are_you_sure'),
    newTestCase: t('new_test_case'),
    export: t('export'),
    status: t('status'),
    noCasesFound: t('no_cases_found'),
    caseTitle: t('case_title'),
    caseDescription: t('case_description'),
    caseTitleOrDescription: t('case_title_or_description'),
    create: t('create'),
    pleaseEnter: t('please_enter'),
    apply: t('apply'),
    filter: t('filter'),
    clearAll: t('clear_all'),
    selectPriorities: t('select_priorities'),
    selected: t('selected'),
    type: t('type'),
    selectTypes: t('select_types'),
    casesSelected: t('cases_selected'),
    selectAction: t('select_action'),
    move: t('move'),
    clone: t('clone'),
    casesMoved: t('cases_moved'),
    casesCloned: t('cases_cloned'),
    tags: t('tags'),
    selectTags: t('select_tags'),
    import: t('import'),
    importCases: t('import_cases'),
    importAvailable: t('import_available'),
    downloadTemplate: t('download_template'),
    clickToUpload: t('click_to_upload'),
    orDragAndDrop: t('or_drag_and_drop'),
    maxFileSize: t('max_file_size'),
    casesImported: t('cases_imported'),
    createMore: t('create_more'),
  };

  const priorityTranslation = useTranslations('Priority');
  const priorityMessages: PriorityMessages = {
    critical: priorityTranslation('critical'),
    high: priorityTranslation('high'),
    medium: priorityTranslation('medium'),
    low: priorityTranslation('low'),
  };

  const testTypeMessages: TestTypeMessages = {};

  return (
    <CasesWorkspace
      projectId={params.projectId}
      folderId={params.folderId}
      locale={params.locale as LocaleCodeType}
      messages={messages}
      priorityMessages={priorityMessages}
      testTypeMessages={testTypeMessages}
      runDialogMessages={{
        run: t('create_run'),
        runName: runs('run_name'),
        runDescription: runs('run_description'),
        close: runs('close'),
        create: runs('create'),
        update: runs('update'),
        pleaseEnter: runs('please_enter'),
      }}
    >
      {children}
    </CasesWorkspace>
  );
}
