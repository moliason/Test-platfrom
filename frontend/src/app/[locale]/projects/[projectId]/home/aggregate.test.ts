import { describe, expect, it } from 'vitest';
import { aggregateTestType } from './aggregate';

describe('aggregateTestType', () => {
  it('counts built-in and project-specific types by sort order', () => {
    const project = {
      Folders: [{ Cases: [{ type: 0 }, { type: 4 }, { type: 4 }] }],
    } as never;
    const caseTypes = [
      { id: 1, name: '功能', sortOrder: 0, projectId: null },
      { id: 5, name: '兼容性', sortOrder: 4, projectId: 7 },
    ];

    expect(aggregateTestType(project, caseTypes)).toEqual([
      { type: 0, count: 1 },
      { type: 4, count: 2 },
    ]);
  });
});
