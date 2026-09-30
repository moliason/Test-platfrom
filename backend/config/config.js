import { defaultDangerKey } from '../routes/users/authSettings.js';

export const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:8000';
export const SECRET_KEY = process.env.SECRET_KEY || defaultDangerKey;

export const IS_PROD = process.env.NODE_ENV === 'production';
export const PORT = process.env.PORT || 8001;
export const API_PATH = process.env.API_PATH || '/api';

export function getSequelizeConfig() {
  const config = {
    dialect: 'postgres',
    database: process.env.DB_NAME || process.env.POSTGRES_DB || 'unittcms',
    username: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
    password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || '',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || process.env.POSTGRES_PORT || 5432),
  };

  if (process.env.DATABASE_URL) {
    config.use_env_variable = 'DATABASE_URL';
  }

  if (process.env.DB_SSL === 'true' || process.env.DATABASE_SSL === 'true') {
    config.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
      },
    };
  }

  return config;
}

const sequelizeConfig = getSequelizeConfig();

export default {
  development: sequelizeConfig,
  test: sequelizeConfig,
  production: sequelizeConfig,
};
