import express from 'express';
const router = express.Router();
import { DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';
import defineUser from '../../models/users.js';
import authMiddleware from '../../middleware/auth.js';
import { roles } from './authSettings.js';

export default function (sequelize) {
  const { verifySignedIn, verifyAdmin } = authMiddleware(sequelize);
  const User = defineUser(sequelize, DataTypes);

  router.get('/', verifySignedIn, verifyAdmin, async (req, res) => {
    try {
      const users = await User.findAll({
        attributes: ['id', 'email', 'username', 'role', 'avatarPath'],
      });
      res.json(users);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });

  router.post('/', verifySignedIn, verifyAdmin, async (req, res) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
      const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      const role = req.body?.role;

      if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email' });
      }
      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      if (
        !Number.isInteger(role) ||
        role < 0 ||
        role >= roles.length
      ) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ error: 'Email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({
        email,
        username,
        password: hashedPassword,
        role,
        locale: 'zh-CN',
      });

      return res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          avatarPath: user.avatarPath ?? null,
          locale: user.locale,
        },
      });
    } catch (error) {
      if (error?.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'Email already exists' });
      }
      console.error(error);
      return res.status(500).send('Internal Server Error');
    }
  });

  return router;
}
