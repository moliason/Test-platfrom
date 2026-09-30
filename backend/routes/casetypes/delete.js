import express from 'express';
const router = express.Router();
import { DataTypes } from 'sequelize';
import authMiddleware from '../../middleware/auth.js';
import defineCaseType from '../../models/caseTypes.js';
import defineCase from '../../models/cases.js';
import defineFolder from '../../models/folders.js';

export default function (sequelize) {
  const { verifySignedIn, verifyAdmin } = authMiddleware(sequelize);
  const CaseType = defineCaseType(sequelize, DataTypes);
  const Case = defineCase(sequelize, DataTypes);
  const Folder = defineFolder(sequelize, DataTypes);
  Case.belongsTo(Folder, { foreignKey: 'folderId' });

  router.delete('/:id', verifySignedIn, verifyAdmin, async (req, res) => {
    try {
      const caseType = await CaseType.findByPk(req.params.id);
      if (!caseType) {
        return res.status(404).json({ error: 'Case type not found' });
      }

      if (caseType.projectId === null) {
        return res.status(400).json({ error: 'Built-in case types cannot be deleted' });
      }

      const usedCount = await Case.count({
        where: { type: caseType.sortOrder },
        include: [
          {
            model: Folder,
            attributes: [],
            required: true,
            where: { projectId: caseType.projectId },
          },
        ],
      });
      if (usedCount > 0) {
        return res.status(409).json({ error: 'Case type is in use' });
      }

      await caseType.destroy();
      res.json({ id: caseType.id });
    } catch (error) {
      console.error('Error deleting case type:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
