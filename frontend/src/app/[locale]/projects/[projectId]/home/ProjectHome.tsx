'use client';
import { useState, useEffect, useContext } from 'react';
import { Card, CardBody, Chip, Divider } from '@heroui/react';
import { Folder, Clipboard, FlaskConical } from 'lucide-react';
import { useTheme } from 'next-themes';
import { aggregateBasicInfo, aggregateTestPriority, aggregateTestType, aggregateProgress } from './aggregate';
import { HomeMessages } from './page';
import TestTypesChart from './TestTypesDonutChart';
import TestPriorityChart from './TestPriorityDonutChart';
import TestProgressBarChart from './TestProgressColumnChart';
import Config from '@/config/config';
import { TokenContext } from '@/utils/TokenProvider';
import { ProgressSeriesType } from '@/types/run';
import { title, subtitle } from '@/components/primitives';
import { TestRunCaseStatusMessages } from '@/types/status';
import { CaseTypeOption, TestTypeMessages } from '@/types/testType';
import { testTypes } from '@/config/selection';
import { PriorityMessages } from '@/types/priority';
import { ProjectType } from '@/types/project';
import { CasePriorityCountType, CaseTypeCountType } from '@/types/chart';
import { logError } from '@/utils/errorHandler';
import { fetchCaseTypes } from '@/utils/caseTypesControls';

const apiServer = Config.apiServer;

async function fetchProject(jwt: string, projectId: number) {
  const fetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
  };

  const url = `${apiServer}/home/${projectId}`;

  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error: unknown) {
    logError('Error fetching data:', error);
  }
}

type Props = {
  projectId: string;
  messages: HomeMessages;
  testRunCaseStatusMessages: TestRunCaseStatusMessages;
  testTypeMessages: TestTypeMessages;
  priorityMessages: PriorityMessages;
};

type HomeData = {
  project: ProjectType;
  folderNum: number;
  caseNum: number;
  runNum: number;
  typesCounts: CaseTypeCountType[];
  caseTypes: CaseTypeOption[];
  priorityCounts: CasePriorityCountType[];
  progressCategories: string[];
  progressSeries: ProgressSeriesType[];
};

export function ProjectHome({
  projectId,
  messages,
  testRunCaseStatusMessages,
  testTypeMessages,
  priorityMessages,
}: Props) {
  const context = useContext(TokenContext);
  const { theme } = useTheme();
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [projectLoadError, setProjectLoadError] = useState(false);

  useEffect(() => {
    async function fetchDataEffect() {
      if (!context.isSignedIn()) {
        return;
      }

      try {
        const [data, typeData] = await Promise.all([
          fetchProject(context.token.access_token, Number(projectId)),
          fetchCaseTypes(context.token.access_token, projectId),
        ]);
        if (!data) {
          setProjectLoadError(true);
          return;
        }

        const caseTypes =
          Array.isArray(typeData) && typeData.length > 0
            ? typeData
            : testTypes.map((type, index) => ({
                id: index,
                name: testTypeMessages[type.uid] ?? type.label,
                sortOrder: index,
                projectId: null,
              }));
        const { folderNum, runNum, caseNum } = aggregateBasicInfo(data);
        const typesCounts = aggregateTestType(data, caseTypes);
        const priorityCounts = aggregateTestPriority(data);
        const { series: progressSeries, categories: progressCategories } = aggregateProgress(
          data,
          testRunCaseStatusMessages
        );

        setHomeData({
          project: data,
          folderNum,
          caseNum,
          runNum,
          typesCounts,
          caseTypes,
          priorityCounts,
          progressCategories,
          progressSeries,
        });
      } catch (error: unknown) {
        logError('Error in effect:', error);
      }
    }

    fetchDataEffect();
  }, [context, projectId, testRunCaseStatusMessages, testTypeMessages]);

  if (projectLoadError) {
    return (
      <div className="container mx-auto max-w-5xl pt-6 px-6 flex-grow">
        <p>{messages.accessDenied}</p>
      </div>
    );
  }

  if (!homeData) {
    return null;
  }

  const {
    project,
    folderNum,
    caseNum,
    runNum,
    typesCounts,
    caseTypes,
    priorityCounts,
    progressCategories,
    progressSeries,
  } = homeData;

  return (
    <div className="container mx-auto max-w-5xl pt-6 px-6 flex-grow">
      <h1 className={title({ size: 'sm' })}>{project.name}</h1>
      <div className="mt-4">
        <Chip variant="flat" startContent={<Folder size={16} />} className="px-3">
          {folderNum} {messages.folders}
        </Chip>
        <Chip variant="flat" startContent={<Clipboard size={16} />} className="px-3 ms-2">
          {caseNum} {messages.testCases}
        </Chip>
        <Chip variant="flat" startContent={<FlaskConical size={16} />} className="px-3 ms-2">
          {runNum} {messages.testRuns}
        </Chip>
      </div>

      {project.detail && (
        <Card className="mt-3 bg-neutral-100 dark:bg-neutral-700 dark:text-white" shadow="none">
          <CardBody>{project.detail}</CardBody>
        </Card>
      )}

      <Divider className="my-8" />
      <h2 className={subtitle()}>{messages.progress}</h2>
      <div style={{ height: '18rem' }}>
        <TestProgressBarChart progressSeries={progressSeries} progressCategories={progressCategories} theme={theme} />
      </div>

      <Divider className="my-12" />
      <h2 className={subtitle()}>{messages.testClassification}</h2>
      <div className="flex pb-20">
        <div style={{ width: '32rem', height: '18rem' }}>
          <h3>{messages.byType}</h3>
          <TestTypesChart
            typesCounts={typesCounts}
            caseTypes={caseTypes}
            testTypeMessages={testTypeMessages}
            theme={theme}
          />
        </div>
        <div style={{ width: '30rem', height: '18rem' }}>
          <h3>{messages.byPriority}</h3>
          <TestPriorityChart priorityCounts={priorityCounts} priorityMessages={priorityMessages} theme={theme} />
        </div>
      </div>
    </div>
  );
}
