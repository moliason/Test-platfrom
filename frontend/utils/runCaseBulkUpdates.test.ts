import { describe, expect, it } from 'vitest';
import type { CaseType } from '@/types/case';
import { applyBulkRunCaseChanges, groupRunCaseAssigneeUpdates } from './runCaseBulkUpdates';

const makeCase = (overrides: Partial<CaseType> = {}): CaseType => ({
  id: 1,
  title: 'Case',
  state: 0,
  priority: 2,
  type: 0,
  automationStatus: 0,
  description: '',
  template: 1,
  preConditions: '',
  expectedResults: '',
  folderId: 1,
  Tags: [],
  RunCases: [
    {
      id: 10,
      runId: 2,
      caseId: 1,
      status: 0,
      editState: 'notChanged',
      assigneeUserId: null,
    },
  ],
  ...overrides,
});

describe('applyBulkRunCaseChanges', () => {
  it('changes the status of selected included cases and marks persisted rows dirty', () => {
    const cases = [makeCase(), makeCase({ id: 2, RunCases: [] })];

    const updated = applyBulkRunCaseChanges(cases, [1, 2], { status: 2 });

    expect(updated[0].RunCases?.[0]).toMatchObject({ status: 2, editState: 'changed' });
    expect(updated[1].RunCases).toEqual([]);
    expect(cases[0].RunCases?.[0]).toMatchObject({ status: 0, editState: 'notChanged' });
  });

  it('replaces tags on every selected case without changing unselected cases', () => {
    const cases = [makeCase(), makeCase({ id: 2, Tags: [{ id: 3, name: 'old' }] })];
    const tags = [{ id: 8, name: 'smoke' }];

    const updated = applyBulkRunCaseChanges(cases, [1, 2], { tags });

    expect(updated[0].Tags).toEqual(tags);
    expect(updated[1].Tags).toEqual(tags);
    expect(cases[1].Tags).toEqual([{ id: 3, name: 'old' }]);
  });
});

describe('groupRunCaseAssigneeUpdates', () => {
  it('maps pending assignments by case ID to persisted run-case IDs', () => {
    const grouped = groupRunCaseAssigneeUpdates(
      [
        { id: 71, caseId: 1 },
        { id: 72, caseId: 2 },
        { id: 73, caseId: 3 },
      ],
      new Map([
        [1, 9],
        [2, 9],
        [3, null],
        [4, 10],
      ])
    );

    expect(grouped).toEqual(
      new Map<number | null, number[]>([
        [9, [71, 72]],
        [null, [73]],
      ])
    );
  });
});
