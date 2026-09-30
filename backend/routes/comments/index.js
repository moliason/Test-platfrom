import express from 'express';
const router = express.Router();
import { DataTypes } from 'sequelize';
import defineComment from '../../models/comments.js';
import defineUser from '../../models/users.js';
import authMiddleware from '../../middleware/auth.js';
import visibilityMiddleware from '../../middleware/verifyVisible.js';

export default function (sequelize) {
  const { verifySignedIn } = authMiddleware(sequelize);
  const { verifyProjectVisibleFromCommentableId } = visibilityMiddleware(sequelize);
  const Comment = defineComment(sequelize, DataTypes);
  const User = defineUser(sequelize, DataTypes);
  Comment.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
  User.hasMany(Comment, { foreignKey: 'userId', onDelete: 'CASCADE' });

  router.get('/', verifySignedIn, verifyProjectVisibleFromCommentableId, async (req, res) => {
    const { commentableType, commentableId } = req.query;

    if (!commentableType || !commentableId) {
      return res.status(400).json({ error: 'commentableType and commentableId are required' });
    }

    try {
      const comments = await Comment.findAll({
        where: {
          commentableType: commentableType,
          commentableId: commentableId,
        },
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'email'],
          },
        ],
        order: [['createdAt', 'ASC']],
      });
      res.json(comments);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });

  return router;
}
