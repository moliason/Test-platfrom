import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Sequelize } from 'sequelize';
import membersEditRoute from './edit.js';

vi.mock('../../middleware/auth.js', () => ({
  default: () => ({
    verifySignedIn: vi.fn((req, res, next) => {
      req.userId = 1;
      next();
    }),
  }),
}));

vi.mock('../../middleware/verifyEditable.js', () => ({
  default: () => ({
    verifyProjectManagerFromProjectId: vi.fn((req, res, next) => next()),
  }),
}));

const mockMember = {
  findOne: vi.fn(),
};
vi.mock('../../models/members.js', () => ({ default: () => mockMember }));

const mockUser = {
  findByPk: vi.fn(),
};
vi.mock('../../models/users.js', () => ({ default: () => mockUser }));

describe('PUT /members', () => {
  let app;
  const sequelize = new Sequelize({ dialect: 'sqlite', logging: false });

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/members', membersEditRoute(sequelize));
  });

  it('does not allow changing project role for a global administrator', async () => {
    mockUser.findByPk.mockResolvedValue({ id: 3, role: 0 });

    const res = await request(app).put('/members?userId=3&projectId=1&role=1');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Global administrator project role cannot be changed');
    expect(mockMember.findOne).not.toHaveBeenCalled();
  });

  it('updates project role for a normal member', async () => {
    const member = { update: vi.fn().mockResolvedValue({ id: 1, role: 1 }) };
    mockUser.findByPk.mockResolvedValue({ id: 4, role: 1 });
    mockMember.findOne.mockResolvedValue(member);

    const res = await request(app).put('/members?userId=4&projectId=1&role=1');

    expect(res.status).toBe(200);
    expect(member.update).toHaveBeenCalledWith({ userId: '4', projectId: '1', role: '1' });
  });
});
