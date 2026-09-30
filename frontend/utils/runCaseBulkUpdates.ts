import type { CaseType } from '@/types/case';
import type { RunCaseType } from '@/types/run';

type BulkRunCaseChanges = {
  status?: number;
  tags?: NonNullable<CaseType['Tags']>;
};

export function applyBulkRunCaseChanges(
  cases: CaseType[],
  selectedCaseIds: number[],
  changes: BulkRunCaseChanges
): CaseType[] {
  const selectedIds = new Set(selectedCaseIds);

  return cases.map((testCase) => {
    if (!selectedIds.has(testCase.id)) {
      return testCase;
    }

    const updatedCase: CaseType = {
      ...testCase,
      ...(changes.tags ? { Tags: changes.tags.map((tag) => ({ ...tag })) } : {}),
    };

    if (changes.status === undefined || !testCase.RunCases?.[0] || testCase.RunCases[0].editState === 'deleted') {
      return updatedCase;
    }

    const runCase = testCase.RunCases[0];
    updatedCase.RunCases = [
      {
        ...runCase,
        status: changes.status,
        editState: runCase.editState === 'notChanged' ? 'changed' : runCase.editState,
      },
      ...testCase.RunCases.slice(1),
    ];

    return updatedCase;
  });
}

export function groupRunCaseAssigneeUpdates(
  savedRunCases: Array<Pick<RunCaseType, 'id' | 'caseId'>>,
  pendingAssigneesByCaseId: ReadonlyMap<number, number | null>
): Map<number | null, number[]> {
  const runCaseIdByCaseId = new Map(savedRunCases.map((runCase) => [runCase.caseId, runCase.id]));
  const groupedUpdates = new Map<number | null, number[]>();

  pendingAssigneesByCaseId.forEach((userId, caseId) => {
    const runCaseId = runCaseIdByCaseId.get(caseId);
    if (!runCaseId || runCaseId <= 0) return;

    const runCaseIds = groupedUpdates.get(userId) ?? [];
    runCaseIds.push(runCaseId);
    groupedUpdates.set(userId, runCaseIds);
  });

  return groupedUpdates;
}
