import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Op, Sequelize } from 'sequelize';
import caseTypesIndexRoute from './index.js';

vi.mock('../../middleware/auth.js', () => ({
  default: () => ({
    verifySignedIn: vi.fn((req, res, next) => next()),
  }),
}));

vi.mock('../../middleware/verifyVisible.js', () => ({
  default: () => ({
    verifyProjectVisibleFromProjectId: vi.fn((req, res, next) => next()),
  }),
}));

const mockCaseType = {
  findAll: vi.fn(),
};
vi.mock('../../models/caseTypes.js', () => ({ default: () => mockCaseType }));

describe('list case types', () => {
  let app;
  const sequelize = new Sequelize({ dialect: 'sqlite', logging: false });

  beforeEach(() => {
    app = express();
    app.use('/casetypes', caseTypesIndexRoute(sequelize));
    vi.clearAllMocks();
  });

  it('requires a project id', async () => {
    const res = await request(app).get('/casetypes');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('projectId is required');
    expect(mockCaseType.findAll).not.toHaveBeenCalled();
  });

  it('returns built-in types and types from the requested project', async () => {
    mockCaseType.findAll.mockResolvedValue([
      { id: 1, name: '功能', sortOrder: 0, projectId: null },
      { id: 5, name: '兼容性', sortOrder: 4, projectId: 7 },
    ]);

    const res = await request(app).get('/casetypes?projectId=7');

    expect(res.status).toBe(200);
    expect(mockCaseType.findAll).toHaveBeenCalledWith({
      where: {
        [Op.or]: [{ projectId: null }, { projectId: 7 }],
      },
      order: [
        ['sortOrder', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    expect(res.body).toHaveLength(2);
  });
});
