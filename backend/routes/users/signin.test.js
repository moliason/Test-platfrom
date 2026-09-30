import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Op } from 'sequelize';
import signinRoute from './signin.js';

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'token'),
  },
}));

const mockUser = {
  findOne: vi.fn(),
};

vi.mock('../../models/users.js', () => ({
  default: () => mockUser,
}));

describe('POST /users/signin', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/users', signinRoute({}));
  });

  it('allows signing in with email', async () => {
    const bcrypt = await import('bcrypt');
    bcrypt.default.compare.mockResolvedValue(true);
    mockUser.findOne.mockResolvedValue({
      id: 1,
      email: 'admin666@local',
      username: 'admin666',
      password: 'hashed-password',
      role: 0,
    });

    const res = await request(app).post('/users/signin').send({
      email: ' Admin666@Local ',
      password: '666666',
    });

    expect(res.status).toBe(200);
    expect(mockUser.findOne).toHaveBeenCalledWith({
      where: {
        email: {
          [Op.iLike]: 'admin666@local',
        },
      },
    });
    expect(res.body.access_token).toBe('token');
    expect(res.body.user.username).toBe('admin666');
  });

  it('rejects local username sign-in', async () => {
    const bcrypt = await import('bcrypt');

    const res = await request(app).post('/users/signin').send({
      email: 'admin666',
      password: '666666',
    });

    expect(res.status).toBe(401);
    expect(mockUser.findOne).not.toHaveBeenCalled();
    expect(bcrypt.default.compare).not.toHaveBeenCalled();
  });
});
