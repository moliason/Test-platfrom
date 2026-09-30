import express from 'express';
const router = express.Router();
import { DataTypes, Op } from 'sequelize';
import authMiddleware from '../../middleware/auth.js';
import defineCaseType from '../../models/caseTypes.js';

export default function (sequelize) {
  const { verifySignedIn, verifyAdmin } = authMiddleware(sequelize);
  const CaseType = defineCaseType(sequelize, DataTypes);

  router.post('/', verifySignedIn, verifyAdmin, async (req, res) => {
    const projectId = Number(req.query.projectId);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const name = String(req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    if (name.length > 20) {
      return res.status(400).json({ error: 'name must be 20 characters or less' });
    }

    try {
      const projectScope = { [Op.or]: [{ projectId: null }, { projectId }] };
      if (await CaseType.findOne({ where: { name, ...projectScope } })) {
        return res.status(409).json({ error: 'Case type name must be unique' });
      }

      const maxSortOrder = await CaseType.max('sortOrder', { where: projectScope });
      const sortOrder = maxSortOrder === null ? 0 : Number(maxSortOrder) + 1;
      const caseType = await CaseType.create({ name, sortOrder, projectId });
      res.status(201).json(caseType);
    } catch (error) {
      console.error('Error creating case type:', error);

      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'Case type name must be unique' });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
