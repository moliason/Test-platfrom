import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import usersRoute from './index.js';
import { roles } from './authSettings.js';

const mocks = vi.hoisted(() => ({
  allowAdmin: true,
  findOne: vi.fn(),
  create: vi.fn(),
  hash: vi.fn(),
}));

vi.mock('../../middleware/auth.js', () => ({
  default: () => ({
    verifySignedIn: (req, _res, next) => {
      req.userId = 1;
      next();
    },
    verifyAdmin: (_req, res, next) => {
      if (!mocks.allowAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    },
  }),
}));

vi.mock('../../models/users.js', () => ({
  default: () => ({
    findOne: mocks.findOne,
    create: mocks.create,
  }),
}));

vi.mock('bcrypt', () => ({
  default: { hash: mocks.hash },
}));

describe('POST /users', () => {
  const app = express();
  app.use(express.json());
  app.use('/users', usersRoute({}));

  beforeEach(() => {
    mocks.allowAdmin = true;
    mocks.findOne.mockReset();
    mocks.create.mockReset();
    mocks.hash.mockReset();
    mocks.findOne.mockResolvedValue(null);
    mocks.hash.mockResolvedValue('hashed-password');
  });

  it.each(roles.map((role, index) => [role.uid, index]))(
    'creates a %s account with the selected role',
    async (_role, role) => {
      mocks.create.mockResolvedValue({
        id: 9,
        email: 'new@example.com',
        username: 'new-user',
        role,
        avatarPath: null,
        locale: 'zh-CN',
      });

      const res = await request(app).post('/users').send({
        email: 'new@example.com',
        username: 'new-user',
        password: '12345678',
        role,
      });

      expect(res.status).toBe(201);
      expect(mocks.hash).toHaveBeenCalledWith('12345678', 10);
      expect(mocks.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        username: 'new-user',
        password: 'hashed-password',
        role,
        locale: 'zh-CN',
      });
      expect(res.body).toEqual({
        user: {
          id: 9,
          email: 'new@example.com',
          username: 'new-user',
          role,
          avatarPath: null,
          locale: 'zh-CN',
        },
      });
    }
  );

  it('rejects invalid account fields and roles', async () => {
    const res = await request(app).post('/users').send({
      email: 'not-an-email',
      username: '',
      password: 'short',
      role: 99,
    });

    expect(res.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each([undefined, null, '', false, '0', 99])('rejects the invalid role %s', async (role) => {
    const res = await request(app).post('/users').send({
      email: 'new@example.com',
      username: 'new-user',
      password: '12345678',
      role,
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid role' });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate email addresses', async () => {
    mocks.findOne.mockResolvedValue({ id: 3 });

    const res = await request(app).post('/users').send({
      email: 'existing@example.com',
      username: 'new-user',
      password: '12345678',
      role: 1,
    });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Email already exists' });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('rejects non-administrators', async () => {
    mocks.allowAdmin = false;

    const res = await request(app).post('/users').send({
      email: 'new@example.com',
      username: 'new-user',
      password: '12345678',
      role: 1,
    });

    expect(res.status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
