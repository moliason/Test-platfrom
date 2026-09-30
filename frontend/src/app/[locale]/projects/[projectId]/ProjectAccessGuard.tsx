'use client';
import { useContext, useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { ProjectMessages } from '@/types/project';
import { TokenContext } from '@/utils/TokenProvider';
import { fetchProject } from '@/utils/projectsControl';

type Props = {
  children: React.ReactNode;
  projectId: string;
  locale: string;
  messages: ProjectMessages;
  accessDenied: string;
};

export default function ProjectAccessGuard({ children, projectId, locale, messages, accessDenied }: Props) {
  const context = useContext(TokenContext);
  const [isProjectVisible, setIsProjectVisible] = useState<boolean | null>(null);
  const isSignedIn = context.isSignedIn();
  const accessToken = context.token.access_token;

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    let isCurrent = true;
    setIsProjectVisible(null);
    fetchProject(accessToken, Number(projectId)).then((project) => {
      if (isCurrent) {
        setIsProjectVisible(Boolean(project));
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [accessToken, isSignedIn, projectId]);

  if (isProjectVisible === false) {
    return (
      <div className="container mx-auto max-w-5xl pt-6 px-6 flex-grow">
        <p>{accessDenied}</p>
      </div>
    );
  }

  if (isProjectVisible === null) {
    return null;
  }

  return (
    <div className="flex border-t-1 dark:border-neutral-700 min-h-[calc(100vh-64px)]">
      <Sidebar messages={messages} locale={locale} />
      <div className="flex w-full min-w-0">
        <div className="min-w-0 flex-grow">{children}</div>
      </div>
    </div>
  );
}
