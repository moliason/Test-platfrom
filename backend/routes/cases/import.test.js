import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Op, Sequelize } from 'sequelize';
import XLSX from 'xlsx';
import casesImportRoute from './import.js';

vi.mock('xlsx', () => ({
  default: {
    read: vi.fn(),
    utils: { sheet_to_json: vi.fn() },
  },
}));

vi.mock('../../middleware/auth.js', () => ({
  default: () => ({
    verifySignedIn: vi.fn((req, res, next) => {
      req.userId = 1;
      next();
    }),
  }),
}));

vi.mock('../../middleware/verifyEditable.js', () => ({
  default: () => ({
    verifyProjectDeveloperFromFolderId: vi.fn((req, res, next) => next()),
  }),
}));

vi.mock('../../utils/caseNumber.js', () => ({
  getNextProjectCaseNo: vi.fn().mockResolvedValue(1),
}));

vi.mock('../../utils/caseTypes.js', () => ({
  getCaseTypeNames: vi.fn().mockResolvedValue(['other', 'security', '\u6027\u80fd', 'functional', '鎬ц兘', 'performance']),
}));

const mockCase = { findAll: vi.fn(), bulkCreate: vi.fn(), belongsToMany: vi.fn() };
vi.mock('../../models/cases.js', () => ({ default: () => mockCase }));

const mockStep = { create: vi.fn(), destroy: vi.fn(), belongsToMany: vi.fn() };
vi.mock('../../models/steps.js', () => ({ default: () => mockStep }));

const mockCaseStep = { findAll: vi.fn(), create: vi.fn(), destroy: vi.fn() };
vi.mock('../../models/caseSteps.js', () => ({ default: () => mockCaseStep }));

const mockFolder = { findByPk: vi.fn() };
vi.mock('../../models/folders.js', () => ({ default: () => mockFolder }));

const FAKE_XLSX_BUFFER = Buffer.from('fake');
const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const validRow = {
  title: 'Test Case',
  priority: 'medium',
  type: 'other',
  template: 'text',
};

describe('Test case import strict validation', () => {
  let app;

  beforeEach(() => {
    const sequelize = new Sequelize({ dialect: 'sqlite', logging: false });
    app = express();
    app.use(express.json());
    app.use('/', casesImportRoute(sequelize));
    vi.clearAllMocks();
    mockFolder.findByPk.mockResolvedValue({ id: 1, projectId: 7 });
    mockCase.findAll.mockResolvedValue([]);
  });

  const postImport = (rows) => {
    XLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } });
    XLSX.utils.sheet_to_json.mockReturnValue(rows);
    return request(app)
      .post('/import?folderId=1')
      .attach('file', FAKE_XLSX_BUFFER, { filename: 'test.xlsx', contentType: XLSX_CONTENT_TYPE });
  };

  describe('Happy path', () => {
    it('should return 200 for valid row', async () => {
      mockCase.bulkCreate.mockResolvedValue([{ id: 1, title: 'Test Case' }]);
      mockStep.create.mockResolvedValue({ id: 1 });
      mockCaseStep.create.mockResolvedValue({ id: 1 });
      const res = await postImport([{ ...validRow }]);
      expect(res.status).toBe(200);
    });

    it('should update a same-title case in the target folder and replace its steps', async () => {
      const existingCase = {
        id: 42,
        caseNo: 9,
        title: 'Test Case',
        update: vi.fn().mockResolvedValue(undefined),
      };
      mockCase.findAll.mockResolvedValue([existingCase]);
      mockCaseStep.findAll.mockResolvedValue([{ stepId: 81 }, { stepId: 82 }]);
      mockStep.create.mockResolvedValue({ id: 100 });
      mockCaseStep.create.mockResolvedValue({ id: 1 });

      const res = await postImport([
        {
          ...validRow,
          description: 'Updated description',
          template: 'step',
          step: '1.open settings',
          expectedStepResult: '1.settings opens',
        },
      ]);

      expect(res.status).toBe(200);
      expect(mockCase.findAll).toHaveBeenCalledWith({
        where: { folderId: '1', title: { [Op.in]: ['Test Case'] } },
        order: [['id', 'ASC']],
        transaction: expect.any(Object),
      });
      expect(existingCase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          folderId: '1',
          title: 'Test Case',
          description: 'Updated description',
        }),
        expect.any(Object)
      );
      expect(existingCase.update.mock.calls[0][0]).not.toHaveProperty('state');
      expect(mockCaseStep.findAll).toHaveBeenCalledWith({
        where: { caseId: 42 },
        attributes: ['stepId'],
        raw: true,
        transaction: expect.any(Object),
      });
      expect(mockCaseStep.destroy).toHaveBeenCalledWith({
        where: { caseId: 42 },
        transaction: expect.any(Object),
      });
      expect(mockStep.destroy).toHaveBeenCalledWith({
        where: { id: [81, 82] },
        transaction: expect.any(Object),
      });
      expect(mockCase.bulkCreate).not.toHaveBeenCalled();
      expect(mockCaseStep.create).toHaveBeenCalledWith({ caseId: 42, stepId: 100, stepNo: 1 }, expect.any(Object));
      expect(res.body).toEqual([expect.objectContaining({ id: 42, caseNo: 9, title: 'Test Case' })]);
    });

    it('should import rows with the Chinese template headers', async () => {
      mockCase.bulkCreate.mockResolvedValue([{ id: 1, title: '启动耗时_冷启动_到启动界面显示时间' }]);
      mockStep.create.mockResolvedValue({ id: 1 });
      mockCaseStep.create.mockResolvedValue({ id: 1 });

      const res = await postImport([
        {
          用例名称: '启动耗时_冷启动_到启动界面显示时间',
          测试点: '测试单板启动到界面显示的时间',
          用例等级: 'Media',
          用例类型: '性能',
          前置条件: '1.单板正常烧录',
          测试步骤: '1.单板完全断电\n2.重新给单板上电',
          预期结果: '3.ISO/EC 25023:2016：小于等于3S',
          用例版本: 'V1.0',
          是否可自动化: '否',
          用例负责人: '',
        },
      ]);

      expect(res.status).toBe(200);
      expect(mockCase.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            title: '启动耗时_冷启动_到启动界面显示时间',
            description: '测试单板启动到界面显示的时间',
            priority: 2,
            type: 2,
            preConditions: '1.单板正常烧录',
            expectedResults: '3.ISO/EC 25023:2016：小于等于3S',
            automationStatus: 1,
            template: 1,
          }),
        ],
        expect.any(Object)
      );
      expect(mockStep.create).toHaveBeenCalledTimes(3);
      expect(mockStep.create).toHaveBeenNthCalledWith(
        1,
        { step: '1.单板完全断电', result: '' },
        expect.any(Object)
      );
      expect(mockStep.create).toHaveBeenNthCalledWith(
        2,
        { step: '2.重新给单板上电', result: '' },
        expect.any(Object)
      );
      expect(mockStep.create).toHaveBeenNthCalledWith(
        3,
        { step: '', result: '3.ISO/EC 25023:2016：小于等于3S' },
        expect.any(Object)
      );
    });

    it('should split numbered multiline steps and map numbered expected results to matching steps', async () => {
      mockCase.bulkCreate.mockResolvedValue([{ id: 1, title: 'Test Case' }]);
      mockStep.create
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 })
        .mockResolvedValueOnce({ id: 3 })
        .mockResolvedValueOnce({ id: 4 })
        .mockResolvedValueOnce({ id: 5 });
      mockCaseStep.create.mockResolvedValue({ id: 1 });

      const res = await postImport([
        {
          ...validRow,
          template: 'step',
          step: [
            '1.单板完全断电',
            '2.重新给单板上电，系统全部重新初始化',
            '3.系统显示主界面之后，操作主界面，测试是否有反馈',
            '4.单板上电开始计时，操作有反馈之后停止计时',
            '5.重新测试5次取平均值',
          ].join('\n'),
          expectedStepResult: '3.ISO/EC 25023:2016：小于等于8S',
        },
      ]);

      expect(res.status).toBe(200);
      expect(mockStep.create).toHaveBeenCalledTimes(5);
      expect(mockStep.create).toHaveBeenNthCalledWith(
        1,
        { step: '1.单板完全断电', result: '' },
        expect.any(Object)
      );
      expect(mockStep.create).toHaveBeenNthCalledWith(
        3,
        {
          step: '3.系统显示主界面之后，操作主界面，测试是否有反馈',
          result: '3.ISO/EC 25023:2016：小于等于8S',
        },
        expect.any(Object)
      );
      expect(mockCaseStep.create).toHaveBeenNthCalledWith(
        5,
        expect.objectContaining({ caseId: 1, stepId: 5, stepNo: 5 }),
        expect.any(Object)
      );
    });

    it('should split two numbered steps and map their numbered results', async () => {
      mockCase.bulkCreate.mockResolvedValue([{ id: 1, title: 'Test Case' }]);
      mockStep.create.mockResolvedValue({ id: 1 });
      mockCaseStep.create.mockResolvedValue({ id: 1 });

      const res = await postImport([
        {
          ...validRow,
          template: 'step',
          step: '1.open settings\n2.open basic info',
          expectedStepResult: '1.settings opens\n2.basic info is displayed',
        },
      ]);

      expect(res.status).toBe(200);
      expect(mockStep.create).toHaveBeenCalledTimes(2);
      expect(mockStep.create).toHaveBeenNthCalledWith(
        1,
        { step: '1.open settings', result: '1.settings opens' },
        expect.any(Object)
      );
      expect(mockStep.create).toHaveBeenNthCalledWith(
        2,
        { step: '2.open basic info', result: '2.basic info is displayed' },
        expect.any(Object)
      );
      expect(mockCaseStep.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ caseId: 1, stepNo: 2 }),
        expect.any(Object)
      );
    });

    it('should create an empty step when a numbered result has no matching step', async () => {
      mockCase.bulkCreate.mockResolvedValue([{ id: 1, title: 'Test Case' }]);
      mockStep.create.mockResolvedValue({ id: 1 });
      mockCaseStep.create.mockResolvedValue({ id: 1 });

      const res = await postImport([
        {
          ...validRow,
          template: 'step',
          step: '1.click the button',
          expectedStepResult: '1.button is active\n2.counter starts increasing',
        },
      ]);

      expect(res.status).toBe(200);
      expect(mockStep.create).toHaveBeenCalledTimes(2);
      expect(mockStep.create).toHaveBeenNthCalledWith(
        1,
        { step: '1.click the button', result: '1.button is active' },
        expect.any(Object)
      );
      expect(mockStep.create).toHaveBeenNthCalledWith(
        2,
        { step: '', result: '2.counter starts increasing' },
        expect.any(Object)
      );
    });

    it('should recognize a number without a separator when matching steps and results', async () => {
      mockCase.bulkCreate.mockResolvedValue([{ id: 1, title: 'Test Case' }]);
      mockStep.create.mockResolvedValue({ id: 1 });
      mockCaseStep.create.mockResolvedValue({ id: 1 });

      const res = await postImport([
        {
          ...validRow,
          template: 'step',
          step: '1.open settings\n2confirm',
          expectedStepResult: '1.settings opens\n2.confirmation is shown',
        },
      ]);

      expect(res.status).toBe(200);
      expect(mockStep.create).toHaveBeenNthCalledWith(
        2,
        { step: '2confirm', result: '2.confirmation is shown' },
        expect.any(Object)
      );
    });

    it('should keep unnumbered continuation lines with the preceding numbered entry', async () => {
      mockCase.bulkCreate.mockResolvedValue([{ id: 1, title: 'Test Case' }]);
      mockStep.create.mockResolvedValue({ id: 1 });
      mockCaseStep.create.mockResolvedValue({ id: 1 });

      const res = await postImport([
        {
          ...validRow,
          template: 'step',
          step: '1.start system\n2.run stress --cpu 1\n--timeout 300s\n3.stop stress',
          expectedStepResult: '2.application keeps running\nand video playback works\n3.stress stops',
        },
      ]);

      expect(res.status).toBe(200);
      expect(mockStep.create).toHaveBeenNthCalledWith(
        2,
        {
          step: '2.run stress --cpu 1\n--timeout 300s',
          result: '2.application keeps running\nand video playback works',
        },
        expect.any(Object)
      );
    });
  });

  describe('Abnormal priority', () => {
    it('should return 400 for "Medium" (wrong casing)', async () => {
      const res = await postImport([{ ...validRow, priority: 'Medium' }]);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('invalid priority');
      expect(res.body.error).toContain('Medium');
    });

    it('should return 400 for "HIGH" (all caps)', async () => {
      const res = await postImport([{ ...validRow, priority: 'HIGH' }]);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('invalid priority');
    });

    it('should return 400 for a completely unknown priority value', async () => {
      const res = await postImport([{ ...validRow, priority: 'urgent' }]);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('invalid priority');
    });
  });

  describe('Invalid type', () => {
    it('should return 400 for "Other" (wrong casing)', async () => {
      const res = await postImport([{ ...validRow, type: 'Other' }]);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('invalid type');
    });

    it('should return 400 for a completely unknown type value', async () => {
      const res = await postImport([{ ...validRow, type: 'integration' }]);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('invalid type');
    });
  });

  describe('automationStatus field', () => {
    it('should return 400 for "Automated" (wrong casing)', async () => {
      const res = await postImport([{ ...validRow, automationStatus: 'Automated' }]);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('invalid automationStatus');
    });

    it('should return 400 for a completely unknown automationStatus value', async () => {
      const res = await postImport([{ ...validRow, automationStatus: 'unknown' }]);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('invalid automationStatus');
    });
  });

  describe('template field', () => {
    it('should return 400 for "Text" (wrong casing)', async () => {
      const res = await postImport([{ ...validRow, template: 'Text' }]);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('invalid template');
    });

    it('should return 400 for "Step" (wrong casing)', async () => {
      const res = await postImport([{ ...validRow, template: 'Step' }]);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('invalid template');
    });

    it('should return 400 for a completely unknown template value', async () => {
      const res = await postImport([{ ...validRow, template: 'unknown' }]);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('invalid template');
    });
  });

  describe('error message should include the row number', () => {
    it('should report row 2 for the first data row', async () => {
      const res = await postImport([{ ...validRow, priority: 'Medium' }]);
      expect(res.body.error).toContain('Row 2');
    });

    it('should report row 3 for the second data row when first row is valid', async () => {
      const res = await postImport([{ ...validRow }, { ...validRow, priority: 'Medium' }]);
      expect(res.body.error).toContain('Row 3');
    });
  });
});
