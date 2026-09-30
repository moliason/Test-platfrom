import express from 'express';
const router = express.Router();
import { DataTypes } from 'sequelize';
import defineRunCase from '../../models/runCases.js';
import defineRun from '../../models/runs.js';
import defineCase from '../../models/cases.js';
import defineFolder from '../../models/folders.js';
import authMiddleware from '../../middleware/auth.js';
import editableMiddleware from '../../middleware/verifyEditable.js';

export default function (sequelize) {
  const { verifySignedIn } = authMiddleware(sequelize);
  const { verifyProjectReporterFromRunId } = editableMiddleware(sequelize);
  const RunCase = defineRunCase(sequelize, DataTypes);
  const Run = defineRun(sequelize, DataTypes);
  const Case = defineCase(sequelize, DataTypes);
  const Folder = defineFolder(sequelize, DataTypes);
  Case.belongsTo(Folder, { foreignKey: 'folderId' });

  router.post('/include', verifySignedIn, verifyProjectReporterFromRunId, async (req, res) => {
    const { caseIds } = req.body ?? {};
    if (!Array.isArray(caseIds) || !caseIds.length || caseIds.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
      return res.status(400).json({ error: 'caseIds must be a non-empty array of positive integers' });
    }
    const selectedIds = [...new Set(caseIds)];
    try {
      await sequelize.transaction(async (transaction) => {
        const run = await Run.findByPk(req.query.runId, { transaction });
        if (!run) throw Object.assign(new Error('Run not found'), { status: 404 });
        const cases = await Case.findAll({
          attributes: ['id'],
          where: { id: selectedIds },
          include: [{ model: Folder, attributes: [], where: { projectId: run.projectId }, required: true }],
          transaction,
        });
        if (cases.length !== selectedIds.length) {
          throw Object.assign(new Error('Some selected cases are missing or belong to another project'), {
            status: 400,
          });
        }
        // The unique (runId, caseId) index also handles concurrent/repeated submissions without resetting results.
        await RunCase.bulkCreate(
          selectedIds.map((caseId) => ({ runId: run.id, caseId, status: 0 })),
          {
            transaction,
            ignoreDuplicates: true,
          }
        );
      });
      res.json({ success: true });
    } catch (error) {
      if (error.status === 400 || error.status === 404) return res.status(error.status).json({ error: error.message });
      console.error('Error adding cases to run:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  router.post('/update', verifySignedIn, verifyProjectReporterFromRunId, async (req, res) => {
    const runId = req.query.runId;
    const runCases = req.body;
    const t = await sequelize.transaction();

    const createRunCase = async (runCase) => {
      const newRunCase = await RunCase.create(
        {
          runId: runId,
          caseId: runCase.caseId,
          status: runCase.status,
        },
        { transaction: t }
      );
      return newRunCase;
    };

    const deleteRunCase = async (runCase) => {
      await RunCase.destroy({
        where: { runId: runId, caseId: runCase.caseId },
        transaction: t,
      });
      return null;
    };

    const updateRunCase = async (runCase) => {
      await RunCase.update(
        {
          status: runCase.status,
        },
        {
          where: { id: runCase.id },
          transaction: t,
        }
      );
      return runCase;
    };

    try {
      const results = await Promise.all(
        runCases.map(async (step) => {
          if (step.editState === 'new') {
            return createRunCase(step);
          } else if (step.editState === 'deleted') {
            return deleteRunCase(step);
          } else if (step.editState === 'changed') {
            return updateRunCase(step);
          } else if (step.editState === 'notChanged') {
            return step;
          }
        })
      );

      await t.commit();
      res.json(results.filter((result) => result !== null));
    } catch (error) {
      console.error(error);
      await t.rollback();
      res.status(500).send('Internal Server Error');
    }
  });

  return router;
}
