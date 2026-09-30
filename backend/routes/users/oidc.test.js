import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Op } from 'sequelize';
import oidcRoute from './oidc.js';
import { roles } from './authSettings.js';

const mocks = vi.hoisted(() => ({
  oidcUser: null,
  findOne: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  sign: vi.fn(() => 'sso-token'),
  authConfig: vi.fn(),
}));

vi.mock('express-openid-connect', () => ({
  auth: (config) => {
    mocks.authConfig(config);
    return (req, res, next) => {
      req.oidc = {
        isAuthenticated: () => true,
        user: mocks.oidcUser,
      };
      res.oidc = { login: vi.fn() };
      next();
    };
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: { sign: mocks.sign },
}));

vi.mock('../../models/users.js', () => ({
  default: () => ({
    findOne: mocks.findOne,
    count: mocks.count,
    create: mocks.create,
  }),
}));

describe('GET /users/oidc/afterCallback', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('OIDC_ISSUER', 'https://sso.example.com/realms/company');
    vi.stubEnv('OIDC_CLIENT_ID', 'unittcms');
    vi.stubEnv('OIDC_CLIENT_SECRET', 'secret');
    mocks.oidcUser = {
      sub: 'd0af19f6-0486-40aa-ae9e-280c649db08f',
      email_verified: true,
      name: '陵江 吴',
      preferred_username: 'wulingjiang',
      email: ' WuLingJiang@Realthon.cc ',
    };
    app = express();
    app.use('/users', oidcRoute({}));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('links an existing account by normalized email only', async () => {
    const update = vi.fn();
    const existingUser = {
      id: 7,
      email: 'wulingjiang@realthon.cc',
      username: 'local-name',
      password: 'local-password',
      role: 1,
      update,
    };
    mocks.findOne.mockResolvedValue(existingUser);

    const res = await request(app).get('/users/oidc/afterCallback');

    expect(res.status).toBe(302);
    expect(mocks.findOne).toHaveBeenCalledWith({
      where: {
        email: {
          [Op.iLike]: 'wulingjiang@realthon.cc',
        },
      },
    });
    expect(update).toHaveBeenCalledWith({ username: 'wulingjiang' });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.sign).toHaveBeenCalledWith({ userId: 7 }, expect.any(String), { expiresIn: '24h' });
  });

  it('configures cookies through the supported session option', () => {
    expect(mocks.authConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        session: {
          cookie: {
            secure: false,
            sameSite: 'Lax',
            httpOnly: true,
          },
        },
      }),
    );
  });

  it('creates an account only when the normalized email does not exist', async () => {
    mocks.findOne.mockResolvedValue(null);
    mocks.count.mockResolvedValue(2);
    mocks.create.mockImplementation(async (user) => ({ id: 8, ...user }));

    const res = await request(app).get('/users/oidc/afterCallback');

    expect(res.status).toBe(302);
    expect(mocks.create).toHaveBeenCalledWith({
      email: 'wulingjiang@realthon.cc',
      password: expect.any(String),
      username: 'wulingjiang',
      role: roles.findIndex((entry) => entry.uid === 'user'),
    });
  });
});
