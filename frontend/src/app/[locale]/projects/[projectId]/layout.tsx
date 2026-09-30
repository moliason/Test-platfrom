import { useTranslations } from 'next-intl';
import ProjectAccessGuard from './ProjectAccessGuard';
import { ProjectMessages } from '@/types/project';

export default function SidebarLayout({
  children,
  params: { locale, projectId },
}: {
  children: React.ReactNode;
  params: { locale: string; projectId: string };
}) {
  const t = useTranslations('Project');
  const home = useTranslations('Home');
  const messages: ProjectMessages = {
    toggleSidebar: t('toggle_sidebar'),
    home: t('home'),
    testCases: t('test_cases'),
    testRuns: t('test_runs'),
    members: t('members'),
    settings: t('settings'),
  };

  return (
    <ProjectAccessGuard
      projectId={projectId}
      locale={locale}
      messages={messages}
      accessDenied={home('access_denied')}
    >
      {children}
    </ProjectAccessGuard>
  );
}
