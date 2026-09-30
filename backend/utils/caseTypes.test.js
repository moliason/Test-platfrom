import { describe, expect, it, vi } from 'vitest';
import { Op, Sequelize } from 'sequelize';
import { getCaseTypeNames } from './caseTypes.js';

const mockCaseType = {
  findAll: vi.fn(),
};
vi.mock('../models/caseTypes.js', () => ({ default: () => mockCaseType }));

describe('getCaseTypeNames', () => {
  it('builds the type list for one project', async () => {
    const sequelize = new Sequelize({ dialect: 'sqlite', logging: false });
    mockCaseType.findAll.mockResolvedValue([
      { name: '功能', sortOrder: 0, projectId: null },
      { name: '兼容性', sortOrder: 4, projectId: 7 },
    ]);

    const names = await getCaseTypeNames(sequelize, 7);

    expect(mockCaseType.findAll).toHaveBeenCalledWith({
      where: {
        [Op.or]: [{ projectId: null }, { projectId: 7 }],
      },
      order: [
        ['sortOrder', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    expect(names[0]).toBe('功能');
    expect(names[4]).toBe('兼容性');
  });
});
