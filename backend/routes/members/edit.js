import express from 'express';
const router = express.Router();
import { DataTypes } from 'sequelize';
import defineMember from '../../models/members.js';
import defineUser from '../../models/users.js';
import authMiddleware from '../../middleware/auth.js';
import editableMiddleware from '../../middleware/verifyEditable.js';
import { roles } from '../users/authSettings.js';

export default function (sequelize) {
  const { verifySignedIn } = authMiddleware(sequelize);
  const { verifyProjectManagerFromProjectId } = editableMiddleware(sequelize);
  const Member = defineMember(sequelize, DataTypes);
  const User = defineUser(sequelize, DataTypes);

  router.put('/', verifySignedIn, verifyProjectManagerFromProjectId, async (req, res) => {
    const userId = req.query.userId;
    const projectId = req.query.projectId;
    const role = req.query.role;

    try {
      if (await isAdmin(User, userId)) {
        return res.status(400).json({ error: 'Global administrator project role cannot be changed' });
      }

      const member = await Member.findOne({
        where: {
          userId: userId,
          projectId: projectId,
        },
      });

      if (!member) {
        return res.status(404).send('Member not found');
      }

      await member.update({
        userId,
        projectId,
        role,
      });
      res.json(member);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });

  return router;
}

async function isAdmin(User, userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    return false;
  }

  const adminRoleIndex = roles.findIndex((entry) => entry.uid === 'administrator');
  return user.role === adminRoleIndex;
}
