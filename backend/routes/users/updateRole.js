import express from 'express';
import { DataTypes } from 'sequelize';
import defineUser from '../../models/users.js';
import authMiddleware from '../../middleware/auth.js';
import { roles } from './authSettings.js';
const router = express.Router();

export default function (sequelize) {
  const { verifySignedIn, verifyAdmin } = authMiddleware(sequelize);
  const User = defineUser(sequelize, DataTypes);

  router.put('/:userId/role', verifySignedIn, verifyAdmin, async (req, res) => {
    // param check
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).send('userId is required');
    }

    const { newRole } = req.body ?? {};
    if (newRole === undefined || newRole === null) {
      return res.status(400).send('newRole is required');
    }

    const requestedRole = Number(newRole);
    if (newRole === '' || !Number.isInteger(requestedRole) || requestedRole < 0 || requestedRole >= roles.length) {
      return res.status(400).send('Invalid role');
    }

    try {
      const targetUser = await User.findByPk(userId);
      if (!targetUser) {
        return res.status(404).send('User not found');
      }

      const adminRoleIndex = roles.findIndex((entry) => entry.uid === 'administrator');
      const userRoleIndex = roles.findIndex((entry) => entry.uid === 'user');

      if (targetUser.role === adminRoleIndex && requestedRole === userRoleIndex) {
        return res.status(400).send('Administrators cannot be demoted.');
      }

      // At least one administrator is required.
      if (requestedRole === userRoleIndex) {
        const adminCount = await User.count({
          where: {
            role: adminRoleIndex,
          },
        });

        if (adminCount <= 1) {
          return res.status(400).send('At least one administrator is required.');
        }
      }

      await targetUser.update({
        role: requestedRole,
      });

      res.json({ user: targetUser });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });

  return router;
}
