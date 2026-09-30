import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Op, Sequelize } from 'sequelize';
import projectsIndexRoute from './index.js';

vi.mock('../../middleware/auth.js', () => ({
  default: () => ({
    verifySignedIn: vi.fn((req, res, next) => {
      req.userId = Number(req.query.userId || 1);
      next();
    }),
  }),
}));

const mockProject = {
  hasMany: vi.fn(),
  findAll: vi.fn(),
};
vi.mock('../../models/projects.js', () => ({ default: () => mockProject }));

const mockMember = {};
vi.mock('../../models/members.js', () => ({ default: () => mockMember }));

const mockUser = {
  findByPk: vi.fn(),
};
vi.mock('../../models/users.js', () => ({ default: () => mockUser }));

describe('projects index', () => {
  let app;
  const sequelize = new Sequelize({ dialect: 'sqlite', logging: false });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/projects', projectsIndexRoute(sequelize));
    vi.clearAllMocks();
  });

  it('returns all projects for administrator by default', async () => {
    mockUser.findByPk.mockResolvedValue({ id: 1, role: 0 });
    mockProject.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const res = await request(app).get('/projects');

    expect(res.status).toBe(200);
    expect(mockProject.findAll).toHaveBeenCalledWith();
    expect(res.body).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('returns owned and participated projects when onlyUserProjects is requested', async () => {
    mockProject.findAll.mockResolvedValue([{ id: 1, userId: 1 }]);

    const res = await request(app).get('/projects?onlyUserProjects=true');

    expect(res.status).toBe(200);
    const options = mockProject.findAll.mock.calls[0][0];
    expect(options.include).toEqual([
      {
        model: mockMember,
        attributes: [],
        where: { userId: 1 },
        required: false,
      },
    ]);
    expect(options.where[Op.or]).toEqual([
      { userId: 1 },
      expect.objectContaining({
        attribute: expect.objectContaining({ col: 'Members.userId' }),
        comparator: '=',
        logic: 1,
      }),
    ]);
  });
});
