import { useTranslations } from 'next-intl';
import FoldersPane from './FoldersPane';
import ResizablePanes from '@/components/ResizablePane';
import CaseTreeProvider from './CaseTreeProvider';

export default function FoldersLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { projectId: string; locale: string };
}) {
  const t = useTranslations('Folders');
  const cases = useTranslations('Cases');
  const messages = {
    folder: t('folder'),
    newFolder: t('new_folder'),
    editFolder: t('edit_folder'),
    deleteFolder: t('delete_folder'),
    folderName: t('folder_name'),
    folderDetail: t('folder_detail'),
    close: t('close'),
    create: t('create'),
    update: t('update'),
    pleaseEnter: t('please_enter'),
    delete: t('delete'),
    areYouSure: t('are_you_sure'),
  };

  return (
    <CaseTreeProvider
      key={params.projectId}
      messages={{
        selected: cases('selected'),
        noCasesFound: cases('no_cases_found'),
        loadError: cases('load_error'),
        retry: cases('retry'),
      }}
    >
      <ResizablePanes
        stackOnMobile
        minLeftWidth={25}
        minRightWidth={40}
        defaultLeftWidth={35}
        leftPane={<FoldersPane projectId={params.projectId} messages={messages} locale={params.locale} />}
        rightPane={children}
      />
    </CaseTreeProvider>
  );
}
