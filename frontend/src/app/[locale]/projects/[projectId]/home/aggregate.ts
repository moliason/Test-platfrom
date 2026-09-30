import { ProjectType } from '@/types/project';
import { priorities, testRunCaseStatus } from '@/config/selection';
import { TestRunCaseStatusMessages } from '@/types/status';
import { CasePriorityCountType, CaseTypeCountType } from '@/types/chart';
import { CaseTypeOption } from '@/types/testType';

// aggregate folder, case, run mum
function aggregateBasicInfo(project: ProjectType) {
  const folderNum = project.Folders.length;
  const runNum = project.Runs.length;

  let caseNum = 0;
  project.Folders.forEach((folder) => {
    caseNum += folder.Cases.length;
  });

  return { folderNum, runNum, caseNum };
}

function aggregateTestType(project: ProjectType, caseTypes: CaseTypeOption[]): CaseTypeCountType[] {
  const typesCounts = new Map<number, number>();
  project.Folders.forEach((folder) => {
    folder.Cases.forEach((testcase) => {
      typesCounts.set(testcase.type, (typesCounts.get(testcase.type) || 0) + 1);
    });
  });

  return caseTypes.map((caseType) => ({
    type: caseType.sortOrder,
    count: typesCounts.get(caseType.sortOrder) || 0,
  }));
}

function aggregateTestPriority(project: ProjectType) {
  // count how many test cases are for each priority
  const priorityCounts: number[] = priorities.map(() => {
    return 0;
  });
  project.Folders.forEach((folder) => {
    folder.Cases.forEach((testcase) => {
      const priority = testcase.priority;
      priorityCounts[priority]++;
    });
  });

  const result: CasePriorityCountType[] = [];
  for (let priority = 0; priority <= priorities.length; priority++) {
    result.push({ priority: priority, count: priorityCounts[priority] });
  }

  return result;
}

function aggregateProgress(project: ProjectType, testRunCaseStatusMessages: TestRunCaseStatusMessages) {
  const categories: string[] = [];
  const countsByDate = new Map<string, number[]>();

  project.Runs.forEach((run) => {
    if (!run.RunCases) {
      return;
    }

    run.RunCases.forEach((runCase) => {
      const createdAtDate = new Date(runCase.createdAt);
      const dateString = createdAtDate.toISOString().slice(0, 10);

      let counts = countsByDate.get(dateString);
      if (!counts) {
        counts = testRunCaseStatus.map(() => 0);
        countsByDate.set(dateString, counts);
        categories.push(dateString);
      }
      counts[runCase.status]++;
    });
  });

  const series = testRunCaseStatus.map((status, statusIndex) => ({
    name: testRunCaseStatusMessages[status.uid],
    data: categories.map((date) => countsByDate.get(date)?.[statusIndex] ?? 0),
  }));

  return { series, categories };
}

export { aggregateBasicInfo, aggregateTestType, aggregateTestPriority, aggregateProgress };
