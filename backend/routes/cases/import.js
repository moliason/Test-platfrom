import path from 'path';
import express from 'express';
const router = express.Router();
import multer from 'multer';
import XLSX from 'xlsx';
import { DataTypes, Op } from 'sequelize';
import defineCase from '../../models/cases.js';
import defineFolder from '../../models/folders.js';
import defineStep from '../../models/steps.js';
import defineCaseStep from '../../models/caseSteps.js';
import authMiddleware from '../../middleware/auth.js';
import editableMiddleware from '../../middleware/verifyEditable.js';
import { priorities, automationStatus, templates } from '../../config/enums.js';
import { getNextProjectCaseNo } from '../../utils/caseNumber.js';
import { getCaseTypeNames } from '../../utils/caseTypes.js';

const chinesePriorityValues = {
  Critical: 'critical',
  High: 'high',
  Media: 'medium',
  Medium: 'medium',
  Low: 'low',
  严重: 'critical',
  高: 'high',
  中: 'medium',
  中等: 'medium',
  低: 'low',
};

const chineseTestTypeValues = {
  其他: 'other',
  安全: 'security',
  性能: 'performance',
  可访问性: 'accessibility',
  功能: 'functional',
  验收: 'acceptance',
  易用性: 'usability',
  冒烟: 'smokeSanity',
  兼容性: 'compatibility',
  破坏性: 'destructive',
  回归: 'regression',
  自动化: 'automated',
  手动: 'manual',
};

const chineseAutomationStatusValues = {
  是: 'automated',
  否: 'automation-not-required',
  可自动化: 'automated',
  不可自动化: 'cannot-be-automated',
  无需自动化: 'automation-not-required',
};

const fileFilter = (req, file, cb) => {
  const allowedFileTypes = ['.xlsx', '.xls'];
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  const extname = allowedFileTypes.includes(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimeTypes.includes(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only Excel files (.xlsx, .xls) are allowed!'));
  }
};

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
});

export default function (sequelize) {
  const Case = defineCase(sequelize, DataTypes);
  const Folder = defineFolder(sequelize, DataTypes);
  const Step = defineStep(sequelize, DataTypes);
  const CaseStep = defineCaseStep(sequelize, DataTypes);
  Case.belongsToMany(Step, { through: CaseStep, foreignKey: 'caseId', otherKey: 'stepId' });
  Step.belongsToMany(Case, { through: CaseStep, foreignKey: 'stepId', otherKey: 'caseId' });
  const { verifySignedIn } = authMiddleware(sequelize);
  const { verifyProjectDeveloperFromFolderId } = editableMiddleware(sequelize);

  router.post(
    '/import',
    (req, res, next) => {
      upload.single('file')(req, res, function (err) {
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        next();
      });
    },
    verifySignedIn,
    verifyProjectDeveloperFromFolderId,
    async (req, res) => {
      const { folderId } = req.query;

      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (!folderId) {
        return res.status(400).json({ error: 'folderId is required' });
      }

      let jsonData;
      try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        jsonData = XLSX.utils
          .sheet_to_json(worksheet)
          .filter((row) => !_isEmptyImportRow(row))
          .map((row) => _normalizeImportRow(row));
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: 'Invalid Excel file' });
      }

      const folder = await Folder.findByPk(folderId);
      if (!folder) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      const caseTypeNames = await getCaseTypeNames(sequelize, folder.projectId);
      for (const [index, row] of jsonData.entries()) {
        const errorMessage = _getRowValidationError(row, index, caseTypeNames);
        if (errorMessage) {
          return res.status(400).json({ error: errorMessage });
        }
      }

      let currentTitle = null;
      let previousTitle = null;
      let stepNo = 1;
      const casesToCreate = [];
      const stepsToCreate = [];
      for (const row of jsonData) {
        currentTitle = row['title'].trim();
        previousTitle = casesToCreate[casesToCreate.length - 1]?.title.trim();
        const rowSteps = _getImportStepRows(row);
        if (casesToCreate.length > 0 && previousTitle === currentTitle) {
          for (const rowStep of rowSteps) {
            stepNo += 1;
            stepsToCreate.push({
              caseIndex: casesToCreate.length - 1,
              stepNo: stepNo,
              step: rowStep.step,
              result: rowStep.result,
            });
          }
        } else {
          stepNo = 1;
          casesToCreate.push({
            folderId: folderId,
            title: currentTitle,
            description: row['description'] || '',
            state: 0,
            priority: row['priority'] ? priorities.indexOf(row['priority']) : priorities.indexOf('medium'),
            type: row['type'] ? caseTypeNames.indexOf(row['type']) : 0,
            preConditions: row['preConditions'] || '',
            expectedResults: row['expectedResults'] || '',
            automationStatus: row['automationStatus']
              ? automationStatus.indexOf(row['automationStatus'])
              : automationStatus.indexOf('automation-not-required'),
            template: row['template'] ? templates.indexOf(row['template']) : templates.indexOf('text'),
          });
          for (const [rowStepIndex, rowStep] of rowSteps.entries()) {
            stepsToCreate.push({
              caseIndex: casesToCreate.length - 1,
              stepNo: stepNo + rowStepIndex,
              step: rowStep.step,
              result: rowStep.result,
            });
          }
          stepNo += rowSteps.length - 1;
        }
      }

      // Only open the transaction once all data is known to be valid.
      const t = await sequelize.transaction();
      try {
        const existingCases = await Case.findAll({
          where: {
            folderId,
            title: { [Op.in]: casesToCreate.map((testCase) => testCase.title) },
          },
          order: [['id', 'ASC']],
          transaction: t,
        });
        const existingCaseByTitle = new Map();
        for (const existingCase of existingCases) {
          const title = existingCase.title.trim();
          if (!existingCaseByTitle.has(title)) {
            existingCaseByTitle.set(title, existingCase);
          }
        }

        const importedCases = new Array(casesToCreate.length);
        const newCaseEntries = [];
        for (const [caseIndex, testCase] of casesToCreate.entries()) {
          const existingCase = existingCaseByTitle.get(testCase.title);
          if (!existingCase) {
            newCaseEntries.push({ caseIndex, testCase });
            continue;
          }

          const existingCaseSteps = await CaseStep.findAll({
            where: { caseId: existingCase.id },
            attributes: ['stepId'],
            raw: true,
            transaction: t,
          });
          await CaseStep.destroy({ where: { caseId: existingCase.id }, transaction: t });
          const existingStepIds = existingCaseSteps.map((caseStep) => caseStep.stepId);
          if (existingStepIds.length > 0) {
            await Step.destroy({ where: { id: existingStepIds }, transaction: t });
          }

          const caseUpdates = { ...testCase };
          delete caseUpdates.state;
          await existingCase.update(caseUpdates, { transaction: t });
          importedCases[caseIndex] = existingCase;
        }

        if (newCaseEntries.length > 0) {
          let nextCaseNo = await getNextProjectCaseNo(sequelize, Folder, folderId, t);
          const casesToCreateWithCaseNo = newCaseEntries.map(({ testCase }) => {
            const caseNo = nextCaseNo;
            nextCaseNo += 1;
            return { ...testCase, caseNo };
          });
          const createdCases = await Case.bulkCreate(casesToCreateWithCaseNo, { transaction: t });
          for (const [createdCaseIndex, createdCase] of createdCases.entries()) {
            importedCases[newCaseEntries[createdCaseIndex].caseIndex] = createdCase;
          }
        }

        for (const stepData of stepsToCreate) {
          const importedCase = importedCases[stepData.caseIndex];
          const createdStep = await Step.create(
            {
              step: stepData.step,
              result: stepData.result,
            },
            { transaction: t }
          );
          await CaseStep.create(
            {
              caseId: importedCase.id,
              stepId: createdStep.id,
              stepNo: stepData.stepNo,
            },
            { transaction: t }
          );
        }

        await t.commit();
        res.status(200).json(importedCases);
      } catch (error) {
        await t.rollback();
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  return router;
}

function _normalizeImportRow(row) {
  if (!row['用例名称']) {
    return row;
  }

  const priorityValue = row['用例等级'] ? String(row['用例等级']).trim() : '';
  const typeValue = row['用例类型'] ? String(row['用例类型']).trim() : '';
  const automationStatusValue = row['是否可自动化'] ? String(row['是否可自动化']).trim() : '';
  const expectedResult = row['预期结果'] ? String(row['预期结果']).trim() : '';

  return {
    ...row,
    title: String(row['用例名称']).trim(),
    description: row['测试点'] ? String(row['测试点']).trim() : '',
    priority: chinesePriorityValues[priorityValue] || priorityValue,
    type: _normalizeTestTypeValue(typeValue),
    preConditions: row['前置条件'] ? String(row['前置条件']).trim() : '',
    expectedResults: expectedResult,
    automationStatus: automationStatusValue
      ? chineseAutomationStatusValues[automationStatusValue] || automationStatusValue
      : 'automation-not-required',
    template: 'step',
    step: row['测试步骤'] ? String(row['测试步骤']).trim() : '',
    expectedStepResult: expectedResult,
  };
}

function _isEmptyImportRow(row) {
  return Object.values(row).every((value) => value === null || value === undefined || String(value).trim() === '');
}

function _normalizeTestTypeValue(typeValue) {
  const mappedValue = chineseTestTypeValues[typeValue] || typeValue;
  const legacyTypeValues = {
    performance: '性能',
    functional: '功能',
  };

  return legacyTypeValues[mappedValue] || mappedValue;
}

function _getImportStepRows(row) {
  const numberedSteps = _splitNumberedLines(row['step']);
  const numberedResults = _splitNumberedLines(row['expectedStepResult']);
  if (numberedResults.length === 0 && numberedSteps.length < 2) {
    return [{ step: row['step'] || '', result: row['expectedStepResult'] || '' }];
  }

  const stepByNumber = new Map();
  for (const entry of numberedSteps) {
    stepByNumber.set(entry.no, entry.text);
  }

  const resultByStepNo = new Map();
  for (const entry of numberedResults) {
    resultByStepNo.set(entry.no, entry.text);
  }

  const stepNumbers = [...new Set([...stepByNumber.keys(), ...resultByStepNo.keys()])].sort((a, b) => a - b);
  return stepNumbers.map((stepNo) => ({
    step: stepByNumber.get(stepNo) || '',
    result: resultByStepNo.get(stepNo) || '',
  }));
}

function _splitNumberedLines(value) {
  if (!value) {
    return [];
  }

  const entries = [];
  const lines = String(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');

  for (const line of lines) {
    const match = line.match(/^(\d+)(?:[.．、)]\s*|\s+|(?=[^\d\s]))/);
    if (match) {
      entries.push({ no: Number(match[1]), text: line });
    } else if (entries.length > 0) {
      entries[entries.length - 1].text += `\n${line}`;
    }
  }

  return entries;
}

function _getRowValidationError(row, index, caseTypeNames) {
  const requiredFields = ['title', 'priority', 'type', 'template'];
  const rowNumber = index + 2;

  for (const field of requiredFields) {
    if (!row[field]) {
      return `Row ${rowNumber} is missing required field: ${field}`;
    }
  }

  // Validate priority if provided
  if (row['priority']) {
    const priorityIndex = priorities.indexOf(row['priority']);
    if (priorityIndex === -1) {
      return `Row ${rowNumber} has invalid priority: ${row['priority']}`;
    }
  }

  // Validate type if provided
  if (row['type']) {
    const typeIndex = caseTypeNames.indexOf(row['type']);
    if (typeIndex === -1) {
      return `Row ${rowNumber} has invalid type: ${row['type']}`;
    }
  }

  // Validate automationStatus if provided
  if (row['automationStatus']) {
    const automationStatusIndex = automationStatus.indexOf(row['automationStatus']);
    if (automationStatusIndex === -1) {
      return `Row ${rowNumber} has invalid automationStatus: ${row['automationStatus']}`;
    }
  }

  // Validate template if provided
  if (row['template']) {
    const templateIndex = templates.indexOf(row['template']);
    if (templateIndex === -1) {
      return `Row ${rowNumber} has invalid template: ${row['template']}`;
    }
  }

  return null;
}
