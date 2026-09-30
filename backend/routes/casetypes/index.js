import express from 'express';
const router = express.Router();
import { DataTypes, Op } from 'sequelize';
import authMiddleware from '../../middleware/auth.js';
import visibilityMiddleware from '../../middleware/verifyVisible.js';
import defineCaseType from '../../models/caseTypes.js';

export default function (sequelize) {
  const { verifySignedIn } = authMiddleware(sequelize);
  const { verifyProjectVisibleFromProjectId } = visibilityMiddleware(sequelize);
  const CaseType = defineCaseType(sequelize, DataTypes);

  router.get('/', verifySignedIn, verifyProjectVisibleFromProjectId, async (req, res) => {
    const projectId = Number(req.query.projectId);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    try {
      const caseTypes = await CaseType.findAll({
        where: {
          [Op.or]: [{ projectId: null }, { projectId }],
        },
        order: [
          ['sortOrder', 'ASC'],
          ['id', 'ASC'],
        ],
      });
      res.json(caseTypes);
    } catch (error) {
      console.error('Error fetching case types:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
