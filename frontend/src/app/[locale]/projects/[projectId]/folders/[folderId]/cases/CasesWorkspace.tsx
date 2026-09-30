'use client';
import { ComponentProps, ReactNode, useContext, useEffect } from 'react';
import { useSelectedLayoutSegment, useSearchParams } from 'next/navigation';
import { Spinner, Button } from '@heroui/react';
import CasesPane from './CasesPane';
import { CaseTreeContext } from '../../CaseTreeProvider';
import { useRouter } from '@/src/i18n/routing';

type Props = ComponentProps<typeof CasesPane> & {
  children: ReactNode;
};

export default function CasesWorkspace({ children, ...casesPaneProps }: Props) {
  const selectedSegment = useSelectedLayoutSegment();
  const { entries, loadCases, messages: treeMessages } = useContext(CaseTreeContext)!;
  const router = useRouter();
  const query = useSearchParams().toString();
  const { projectId, folderId, locale, messages } = casesPaneProps;
  const entry = entries[Number(folderId)];

  useEffect(() => {
    if (selectedSegment || !entry?.cases?.length) return;
    const firstCase = entry.cases[0];
    router.replace(`/projects/${projectId}/folders/${folderId}/cases/${firstCase.id}${query ? `?${query}` : ''}`, {
      locale,
      scroll: false,
    });
  }, [entry, folderId, locale, projectId, query, router, selectedSegment]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <CasesPane {...casesPaneProps} />
      <div key={selectedSegment} data-case-view="detail" className="min-h-0 flex-1 overflow-y-auto bg-background">
        {selectedSegment ? (
          children
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-default-500">
            {entry?.error ? (
              <div className="flex items-center gap-2" role="alert">
                {treeMessages.loadError}
                <Button onPress={() => void loadCases(Number(folderId), true)}>{treeMessages.retry}</Button>
              </div>
            ) : entry?.cases?.length === 0 ? (
              messages.noCasesFound
            ) : (
              <Spinner />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
