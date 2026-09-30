import express from 'express';
const router = express.Router();
import { DataTypes } from 'sequelize';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { create } from 'xmlbuilder2';
import defineRun from '../../models/runs.js';
import defineRunCase from '../../models/runCases.js';
import defineCase from '../../models/cases.js';
import defineFolder from '../../models/folders.js';
import defineTag from '../../models/tags.js';
import authMiddleware from '../../middleware/auth.js';
import visibilityMiddleware from '../../middleware/verifyVisible.js';
import { contentDisposition, toSafeFileName } from '../../config/contentDisposition.js';
import { testRunCaseStatus, testRunStatus, priorities, automationStatus } from '../../config/enums.js';
import { getCaseTypeNames } from '../../utils/caseTypes.js';

export default function (sequelize) {
  const { verifySignedIn } = authMiddleware(sequelize);
  const { verifyProjectVisibleFromRunId } = visibilityMiddleware(sequelize);

  const Run = defineRun(sequelize, DataTypes);
  const RunCase = defineRunCase(sequelize, DataTypes);
  const Case = defineCase(sequelize, DataTypes);
  const Folder = defineFolder(sequelize, DataTypes);
  const Tags = defineTag(sequelize, DataTypes);

  RunCase.belongsTo(Case, { foreignKey: 'caseId' });
  Case.belongsToMany(Tags, { through: 'caseTags', foreignKey: 'caseId', otherKey: 'tagId' });
  Tags.belongsToMany(Case, { through: 'caseTags', foreignKey: 'tagId', otherKey: 'caseId' });

  router.get('/download/:runId', verifySignedIn, verifyProjectVisibleFromRunId, async (req, res) => {
    const { runId } = req.params;
    const { type } = req.query;

    if (!runId) {
      return res.status(400).json({ error: 'runId is required' });
    }

    try {
      const run = await Run.findByPk(runId);
      if (!run) {
        return res.status(404).send('Run not found');
      }

      const runName = toSafeFileName(run.name);
      const filename = type === 'xlsx' ? '系统测试报告.xlsx' : `${runName}.${type}`;
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
      res.setHeader('Content-Disposition', contentDisposition(filename));

      if (type === 'xlsx') {
        const [folders, detailedRunCases] = await Promise.all([
          Folder.findAll({ where: { projectId: run.projectId }, order: [['id', 'ASC']] }),
          RunCase.findAll({
            where: { runId },
            include: [{ model: Case, attributes: ['id', 'caseNo', 'folderId', 'title'] }],
          }),
        ]);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'UnitTCMS';
        workbook.title = '系统测试报告';
        workbook.subject = '测试运行报告';
        workbook.created = new Date();
        const reportFolders = folders.length > 0 ? folders : [{ id: null, name: '测试报告' }];
        const caseStatusLabels = ['未测试', '通过', '失败', '重测', '跳过'];

        for (const folder of reportFolders) {
          let sheetName = String(folder.name || '未命名文件夹')
            .replace(/[:\\/?*\[\]]/g, '_')
            .replace(/^'+|'+$/g, '')
            .trim();
          sheetName = (sheetName || '未命名文件夹').slice(0, 31);
          const baseSheetName = sheetName;
          let duplicateIndex = 2;
          while (workbook.worksheets.some((worksheet) => worksheet.name === sheetName)) {
            const suffix = ` (${duplicateIndex})`;
            sheetName = `${baseSheetName.slice(0, 31 - suffix.length)}${suffix}`;
            duplicateIndex += 1;
          }

          const folderRunCases =
            folder.id == null
              ? []
              : detailedRunCases
                  .filter((runCase) => Number(runCase.Case.folderId) === Number(folder.id))
                  .sort(
                    (left, right) =>
                      Number(left.Case.caseNo ?? left.Case.id) - Number(right.Case.caseNo ?? right.Case.id)
                  );

          const worksheet = workbook.addWorksheet(sheetName, {
            views: [{ state: 'frozen', ySplit: 1 }],
            pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
          });

          const headerRow = worksheet.addRow(['测试标题', '测试类型', '结果']);
          headerRow.height = 24;
          headerRow.eachCell((cell) => {
            cell.font = { name: 'SimSun', bold: true, color: { argb: 'FF000000' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            };
          });

          for (const runCase of folderRunCases) {
            const result = caseStatusLabels[runCase.status] || testRunCaseStatus[runCase.status] || runCase.status;
            const row = worksheet.addRow([runCase.Case.title, sheetName, result]);
            row.height = 24;
            row.eachCell((cell) => {
              cell.font = { name: 'SimSun', size: 10, color: { argb: 'FF000000' } };
              cell.alignment = { vertical: 'middle', wrapText: true };
              cell.border = {
                top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              };
            });
            row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell(3).font = { name: 'SimSun', size: 10, bold: true, color: { argb: 'FF000000' } };
          }

          worksheet.columns = [{ width: 62 }, { width: 24 }, { width: 16 }];
          worksheet.autoFilter = { from: 'A1', to: `C${Math.max(worksheet.rowCount, 1)}` };
        }

        const output = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        return res.send(Buffer.from(output));
      }

      const runCases = await RunCase.findAll({
        where: { runId },
        include: [
          {
            model: Case,
            include: [
              {
                model: Tags,
                attributes: ['id', 'name'],
                through: { attributes: [] },
              },
            ],
          },
        ],
      });

      if (type === 'xml') {
        // JUnit xml valid status
        const validStatuses = [1, 2, 4]; // 0: untested, 1: passed, 2 failed, 3: retest, 4: skipped
        const filteredRunCases = runCases.filter((rc) => validStatuses.includes(rc.status));

        // group cases by folder
        const folderMap = new Map();
        for (const rc of filteredRunCases) {
          const folderId = rc.Case.folderId;
          if (!folderMap.has(folderId)) {
            folderMap.set(folderId, []);
          }
          folderMap.get(folderId).push(rc);
        }

        // Construct JUnit xml
        const xml = create({ version: '1.0' });
        const root = xml.ele('testsuites');

        for (const [folderId, cases] of folderMap.entries()) {
          let folderName = '';
          const folder = await Folder.findByPk(folderId);
          if (folder) {
            folderName = folder.name;
          }

          const suite = root.ele('testsuite', {
            name: folderName,
            tests: cases.length,
            failures: cases.filter((c) => c.status === 2).length,
            skipped: cases.filter((c) => c.status === 4).length,
          });

          for (const rc of cases) {
            const testCase = suite.ele('testcase', {
              name: rc.Case.title,
              classname: folderName,
              time: '0',
            });

            if (rc.status === 2) {
              testCase.ele('failure', { message: 'Test failed' }).txt('Test case failed.');
            } else if (rc.status === 4) {
              testCase.ele('skipped', { message: 'skipped' });
            }
          }
        }

        const xmlString = xml.end({ prettyPrint: true });

        res.setHeader('Content-Type', 'application/xml');
        return res.send(xmlString);
      } else if (type === 'json') {
        return res.json(runCases);
      } else if (type === 'csv') {
        const caseTypeNames = await getCaseTypeNames(sequelize, run.projectId);
        const records = runCases.map((rc) => ({
          id: rc.Case.id,
          title: rc.Case.title,
          state: testRunStatus[rc.Case.state] || rc.Case.state,
          priority: priorities[rc.Case.priority] || rc.Case.priority,
          type: caseTypeNames[rc.Case.type] || rc.Case.type,
          automationStatus: automationStatus[rc.Case.automationStatus] || rc.Case.automationStatus,
          tags: rc.Case.Tags && rc.Case.Tags.length > 0 ? rc.Case.Tags.map((tag) => tag.name).join(', ') : '',
          status: testRunCaseStatus[rc.status] || rc.status,
        }));

        const csv = Papa.unparse(records, {
          quotes: true,
          skipEmptyLines: true,
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        return res.send(csv);
      }

      return res.status(400).json({ error: 'Unsupported type. Use ?type=xml, ?type=json, ?type=csv, or ?type=xlsx' });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });

  return router;
}
