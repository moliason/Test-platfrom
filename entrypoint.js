import { createServer as createHttpServer } from 'http';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRequire = createRequire(path.join(__dirname, 'backend', 'package.json'));

// Use express from backend node_modules
import expressModule from './backend/node_modules/express/index.js';
import { API_PATH, IS_PROD } from './backend/config/config.js';
const express = expressModule.default || expressModule;

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    // Use execSync with cwd option to run in the backend directory
    execSync('npx sequelize-cli db:migrate', {
      cwd: path.join(__dirname, 'backend'),
      stdio: 'inherit',
    });
    console.log('Database migrations completed successfully.');
    if (process.env.IS_DEMO === 'true' || process.env.IS_DEMO === '1') {
      console.log('Demo mode detected. Seeding the database...');
      execSync('npx sequelize-cli db:seed:all', {
        cwd: path.join(__dirname, 'backend'),
        stdio: 'inherit',
      });
      console.log('Database seeding completed successfully.');
    }
  } catch (error) {
    console.error('Error running database migrations or seeding:', error);
    throw error;
  }
}

export async function ensureAdminUser({ User, bcrypt, adminUsername, adminPassword, adminEmail, adminRoleIndex }) {
  if (!adminUsername || !adminPassword) {
    return null;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const [user, created] = await User.findOrCreate({
    where: { email: adminEmail },
    defaults: {
      email: adminEmail,
      username: adminUsername,
      password: hashedPassword,
      role: adminRoleIndex,
    },
  });

  if (!created) {
    await user.update({
      username: adminUsername,
      password: hashedPassword,
      role: adminRoleIndex,
    });
  }

  return { created, email: adminEmail, username: adminUsername };
}

async function ensureConfiguredAdminUser() {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminUsername || !adminPassword) {
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL || `${adminUsername}@local`;
  const bcrypt = backendRequire('bcrypt');
  const { DataTypes } = backendRequire('sequelize');
  const { sequelize } = await import('./backend/server.js');
  const defineUserModule = await import('./backend/models/users.js');
  const { roles } = await import('./backend/routes/users/authSettings.js');
  const User = defineUserModule.default(sequelize, DataTypes);
  const adminRoleIndex = roles.findIndex((entry) => entry.uid === 'administrator');

  const result = await ensureAdminUser({ User, bcrypt, adminUsername, adminPassword, adminEmail, adminRoleIndex });
  if (result) {
    console.log(`Admin user ready: ${result.username}`);
  }
}

async function startServer() {
  try {
    const server = express();
    const httpServer = createHttpServer(server);

    // Import the backend app
    const backendAppModule = await import('./backend/server.js');
    const backendApp = backendAppModule.default || backendAppModule;

    console.log(`Mounting backend API at: ${API_PATH}`);
    server.use(API_PATH, backendApp);

    // For Next.js standalone build
    // Check if we have the Next.js server file
    const nextServerPath = './node_modules/next/dist/server/next.js';
    if (fs.existsSync(nextServerPath)) {
      // Import Next.js
      const nextModule = await import(nextServerPath);
      const next = nextModule.default || nextModule;

      // Initialize Next.js app
      const dev = !IS_PROD;
      const nextApp = next({ dev, dir: path.join(__dirname, '.') });
      const handle = nextApp.getRequestHandler();
      await nextApp.prepare();
      console.log('nextjs prepared');

      // Use Next.js to handle all other routes
      server.all('*', (req, res) => handle(req, res));
    } else {
      console.error('Next.js module not found at:', nextServerPath);
      server.all('*', (req, res) => {
        res.status(500).send('Frontend server not available');
      });
    }

    const PORT = process.env.PORT || 8000;
    httpServer.listen(PORT, (err) => {
      if (err) throw err;
      console.log(`> Ready on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMigrations()
    .then(() => ensureConfiguredAdminUser())
    .then(() => {
      startServer();
    })
    .catch((error) => {
      console.error('Failed to start application:', error);
      process.exit(1);
    });
}
