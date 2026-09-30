import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Sequelize } from 'sequelize';
import caseTypesDeleteRoute from './delete.js';

vi.mock('../../middleware/auth.js', () => ({
  default: () => ({
    verifySignedIn: vi.fn((req, res, next) => {
      req.userId = 1;
      next();
    }),
    verifyAdmin: vi.fn((req, res, next) => {
      if (req.query.deny === '1') {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    }),
  }),
}));

const mockCaseType = {
  findByPk: vi.fn(),
};
vi.mock('../../models/caseTypes.js', () => ({ default: () => mockCaseType }));

const mockCase = {
  belongsTo: vi.fn(),
  count: vi.fn(),
};
vi.mock('../../models/cases.js', () => ({ default: () => mockCase }));

const mockFolder = {};
vi.mock('../../models/folders.js', () => ({ default: () => mockFolder }));

describe('delete case type', () => {
  let app;
  const sequelize = new Sequelize({ dialect: 'sqlite', logging: false });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/casetypes', caseTypesDeleteRoute(sequelize));
    vi.clearAllMocks();
  });

  it('requires administrator permission', async () => {
    const res = await request(app).delete('/casetypes/5?deny=1');

    expect(res.status).toBe(403);
    expect(mockCaseType.findByPk).not.toHaveBeenCalled();
  });

  it('returns 404 when the type does not exist', async () => {
    mockCaseType.findByPk.mockResolvedValue(null);

    const res = await request(app).delete('/casetypes/999');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Case type not found');
  });

  it('does not delete built-in types', async () => {
    const caseType = { id: 1, name: '功能', sortOrder: 0, projectId: null, destroy: vi.fn() };
    mockCaseType.findByPk.mockResolvedValue(caseType);

    const res = await request(app).delete('/casetypes/1');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Built-in case types cannot be deleted');
    expect(caseType.destroy).not.toHaveBeenCalled();
  });

  it('does not delete a type used by cases', async () => {
    const caseType = { id: 5, name: '界面', sortOrder: 4, projectId: 7, destroy: vi.fn() };
    mockCaseType.findByPk.mockResolvedValue(caseType);
    mockCase.count.mockResolvedValue(2);

    const res = await request(app).delete('/casetypes/5');

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Case type is in use');
    expect(caseType.destroy).not.toHaveBeenCalled();
  });

  it('deletes an unused added type', async () => {
    const caseType = { id: 5, name: '界面', sortOrder: 4, projectId: 7, destroy: vi.fn() };
    mockCaseType.findByPk.mockResolvedValue(caseType);
    mockCase.count.mockResolvedValue(0);

    const res = await request(app).delete('/casetypes/5');

    expect(res.status).toBe(200);
    expect(mockCase.count).toHaveBeenCalledWith({
      where: { type: 4 },
      include: [
        {
          model: mockFolder,
          attributes: [],
          required: true,
          where: { projectId: 7 },
        },
      ],
    });
    expect(caseType.destroy).toHaveBeenCalled();
    expect(res.body).toEqual({ id: 5 });
  });
});
