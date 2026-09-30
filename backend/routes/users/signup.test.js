import { describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import signupRoute from './signup.js';

describe('POST /users/signup', () => {
  it('returns 403 because sign up is disabled', async () => {
    const app = express();
    app.use(express.json());
    app.use('/users', signupRoute({}));

    const res = await request(app).post('/users/signup').send({
      email: 'new@example.com',
      password: 'password',
      username: 'new-user',
    });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Sign up is disabled' });
  });
});
