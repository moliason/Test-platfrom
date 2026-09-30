import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Op, Sequelize } from 'sequelize';
import caseTypesNewRoute from './new.js';

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
  findOne: vi.fn(),
  max: vi.fn(),
  create: vi.fn(),
};
vi.mock('../../models/caseTypes.js', () => ({ default: () => mockCaseType }));

describe('create case type', () => {
  let app;
  const sequelize = new Sequelize({ dialect: 'sqlite', logging: false });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/casetypes', caseTypesNewRoute(sequelize));
    vi.clearAllMocks();
  });

  it('requires administrator permission', async () => {
    const res = await request(app).post('/casetypes?deny=1').send({ name: '兼容性' });

    expect(res.status).toBe(403);
    expect(mockCaseType.create).not.toHaveBeenCalled();
  });

  it('rejects blank names', async () => {
    const res = await request(app).post('/casetypes?projectId=7').send({ name: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('name is required');
  });

  it('requires a project id', async () => {
    const res = await request(app).post('/casetypes').send({ name: '兼容性' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('projectId is required');
    expect(mockCaseType.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate names', async () => {
    mockCaseType.findOne.mockResolvedValue({ id: 1, name: '性能' });

    const res = await request(app).post('/casetypes?projectId=7').send({ name: '性能' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Case type name must be unique');
  });

  it('creates the next case type at the end', async () => {
    mockCaseType.findOne.mockResolvedValue(null);
    mockCaseType.max.mockResolvedValue(3);
    mockCaseType.create.mockResolvedValue({ id: 5, name: '兼容性', sortOrder: 4, projectId: 7 });

    const res = await request(app).post('/casetypes?projectId=7').send({ name: '  兼容性  ' });

    expect(res.status).toBe(201);
    expect(mockCaseType.findOne).toHaveBeenCalledWith({
      where: {
        name: '兼容性',
        [Op.or]: [{ projectId: null }, { projectId: 7 }],
      },
    });
    expect(mockCaseType.max).toHaveBeenCalledWith('sortOrder', {
      where: {
        [Op.or]: [{ projectId: null }, { projectId: 7 }],
      },
    });
    expect(mockCaseType.create).toHaveBeenCalledWith({ name: '兼容性', sortOrder: 4, projectId: 7 });
    expect(res.body).toEqual({ id: 5, name: '兼容性', sortOrder: 4, projectId: 7 });
  });
});
