import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import homeIndexRoute from './index.js';

vi.mock('../../middleware/auth.js', () => ({
  default: () => ({
    verifySignedIn: (_req, _res, next) => next(),
  }),
}));

vi.mock('../../middleware/verifyVisible.js', () => ({
  default: () => ({
    verifyProjectVisibleFromProjectId: (_req, _res, next) => next(),
  }),
}));

const mockProject = { hasMany: vi.fn(), findByPk: vi.fn() };
const mockFolder = { hasMany: vi.fn() };
const mockCase = {};
const mockRun = { hasMany: vi.fn() };
const mockRunCase = {};

vi.mock('../../models/projects.js', () => ({ default: () => mockProject }));
vi.mock('../../models/folders.js', () => ({ default: () => mockFolder }));
vi.mock('../../models/cases.js', () => ({ default: () => mockCase }));
vi.mock('../../models/runs.js', () => ({ default: () => mockRun }));
vi.mock('../../models/runCases.js', () => ({ default: () => mockRunCase }));

describe('home summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProject.findByPk.mockResolvedValue({ id: 4, name: 'Project', detail: '' });
  });

  it('loads only dashboard fields without multiplying folder and run rows', async () => {
    const app = express();
    app.use('/home', homeIndexRoute({}));

    const response = await request(app).get('/home/4');

    expect(response.status).toBe(200);
    expect(mockProject.findByPk).toHaveBeenCalledWith('4', {
      attributes: ['id', 'name', 'detail'],
      include: [
        {
          model: mockFolder,
          attributes: ['id'],
          separate: true,
          include: [{ model: mockCase, attributes: ['type', 'priority'] }],
        },
        {
          model: mockRun,
          attributes: ['id'],
          separate: true,
          include: [{ model: mockRunCase, attributes: ['status', 'createdAt'] }],
        },
      ],
    });
  });
});
