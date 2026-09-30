import express from 'express';
const router = express.Router();
import { DataTypes, Op } from 'sequelize';
import defineUser from '../../models/users.js';
import defineMember from '../../models/members.js';
import defineProject from '../../models/projects.js';
import authMiddleware from '../../middleware/auth.js';

export default function (sequelize) {
  const { verifySignedIn } = authMiddleware(sequelize);
  const User = defineUser(sequelize, DataTypes);
  const Member = defineMember(sequelize, DataTypes);
  const Project = defineProject(sequelize, DataTypes);

  router.get('/search', verifySignedIn, async (req, res) => {
    try {
      const { projectId, search } = req.query;
      if (!projectId) {
        return res.status(400).json({ error: 'projectId is required' });
      }

      let where = {};
      const searchText = search ? String(search).trim() : '';
      if (searchText) {
        where = {
          [Op.or]: [{ email: { [Op.like]: `%${searchText}%` } }, { username: { [Op.like]: `%${searchText}%` } }],
        };
      }

      let excludeIdArray = [];
      const [members, project] = await Promise.all([
        Member.findAll({
          where: { projectId },
          attributes: ['userId'],
        }),
        Project.findByPk(projectId),
      ]);
      excludeIdArray = members.map((member) => member.userId);
      if (project) {
        excludeIdArray.push(project.userId);
      }
      excludeIdArray.push(req.userId);
      where.id = { [Op.notIn]: excludeIdArray };

      const users = await User.findAll({
        where,
        attributes: ['id', 'email', 'username', 'role', 'avatarPath'],
        limit: 7,
      });
      res.json(users);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });

  return router;
}
