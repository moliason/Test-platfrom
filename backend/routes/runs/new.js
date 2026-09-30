import express from 'express';
const router = express.Router();
import { DataTypes } from 'sequelize';
import defineRun from '../../models/runs.js';
import defineCase from '../../models/cases.js';
import defineFolder from '../../models/folders.js';
import defineRunCase from '../../models/runCases.js';
import authMiddleware from '../../middleware/auth.js';
import editableMiddleware from '../../middleware/verifyEditable.js';

export default function (sequelize) {
  const { verifySignedIn } = authMiddleware(sequelize);
  const { verifyProjectReporterFromProjectId } = editableMiddleware(sequelize);
  const Run = defineRun(sequelize, DataTypes);
  const Case = defineCase(sequelize, DataTypes);
  const Folder = defineFolder(sequelize, DataTypes);
  const RunCase = defineRunCase(sequelize, DataTypes);
  Case.belongsTo(Folder, { foreignKey: 'folderId' });

  router.post('/', verifySignedIn, verifyProjectReporterFromProjectId, async (req, res) => {
    try {
      const projectId = req.query.projectId;
      const { name, configurations, description, state, caseIds } = req.body;
      if (typeof name !== 'string' || !name.trim() || !projectId) {
        return res.status(400).json({ error: 'Name and projectId are required' });
      }
      if (
        caseIds !== undefined &&
        (!Array.isArray(caseIds) || caseIds.length === 0 || caseIds.some((id) => !Number.isSafeInteger(id) || id <= 0))
      ) {
        return res.status(400).json({ error: 'caseIds must be a non-empty array of positive integers' });
      }
      const selectedIds = [...new Set(caseIds ?? [])];

      const newRun = await sequelize.transaction(async (transaction) => {
        if (selectedIds.length) {
          const cases = await Case.findAll({
            attributes: ['id'],
            where: { id: selectedIds },
            include: [{ model: Folder, attributes: [], where: { projectId }, required: true }],
            transaction,
          });
          if (cases.length !== selectedIds.length) {
            throw Object.assign(new Error('Some selected cases are missing or belong to another project'), {
              status: 400,
            });
          }
        }
        const run = await Run.create(
          { name: name.trim(), configurations, description, state, projectId },
          { transaction }
        );
        if (selectedIds.length) {
          await RunCase.bulkCreate(
            selectedIds.map((caseId) => ({ runId: run.id, caseId, status: 0 })),
            { transaction }
          );
        }
        return run;
      });

      res.json(newRun);
    } catch (error) {
      if (error.status === 400) return res.status(400).json({ error: error.message });
      console.error('Error creating new run:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
