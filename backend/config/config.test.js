import { afterEach, describe, expect, it } from 'vitest';
import { getSequelizeConfig } from './config.js';

const savedEnv = { ...process.env };

afterEach(() => {
  process.env = { ...savedEnv };
});

describe('getSequelizeConfig', () => {
  it('uses Postgres by default', () => {
    delete process.env.DATABASE_URL;
    delete process.env.DB_DIALECT;
    delete process.env.DATABASE_DIALECT;

    expect(getSequelizeConfig()).toMatchObject({
      dialect: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'unittcms',
      username: 'postgres',
    });
  });

  it('uses DATABASE_URL for Postgres when provided', () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/unittcms';

    expect(getSequelizeConfig()).toMatchObject({
      dialect: 'postgres',
      use_env_variable: 'DATABASE_URL',
    });
  });

  it('uses separate DB variables for Postgres', () => {
    delete process.env.DATABASE_URL;
    process.env.DB_DIALECT = 'postgres';
    process.env.DB_HOST = 'db';
    process.env.DB_PORT = '5433';
    process.env.DB_NAME = 'cases';
    process.env.DB_USER = 'tester';
    process.env.DB_PASSWORD = 'secret';

    expect(getSequelizeConfig()).toMatchObject({
      dialect: 'postgres',
      host: 'db',
      port: 5433,
      database: 'cases',
      username: 'tester',
      password: 'secret',
    });
  });
});
