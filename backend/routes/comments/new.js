import express from 'express';
const router = express.Router();
import { DataTypes } from 'sequelize';
import defineComment from '../../models/comments.js';
import defineUser from '../../models/users.js';
import authMiddleware from '../../middleware/auth.js';
import editableMiddleware from '../../middleware/verifyEditable.js';

export default function (sequelize) {
  const { verifySignedIn } = authMiddleware(sequelize);
  const { verifyProjectReporterFromCommentableId } = editableMiddleware(sequelize);
  const Comment = defineComment(sequelize, DataTypes);
  const User = defineUser(sequelize, DataTypes);
  Comment.belongsTo(User, { foreignKey: 'userId' });

  router.post('/', verifySignedIn, verifyProjectReporterFromCommentableId, async (req, res) => {
    const { commentableType, commentableId } = req.query;
    const { content } = req.body;

    if (!commentableType || !commentableId || !content) {
      return res.status(400).json({ error: 'commentableType, commentableId, and content are required' });
    }

    try {
      const newComment = await Comment.create({
        commentableType: commentableType,
        commentableId: commentableId,
        userId: req.userId,
        content: content,
      });

      // Fetch the comment with user data
      const commentWithUser = await Comment.findByPk(newComment.id, {
        include: [
          {
            model: sequelize.models.User,
            attributes: ['id', 'username', 'email'],
          },
        ],
      });

      res.json(commentWithUser);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });

  return router;
}
