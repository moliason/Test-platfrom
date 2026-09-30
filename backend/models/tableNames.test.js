import { describe, expect, it } from 'vitest';
import { DataTypes, Sequelize } from 'sequelize';
import defineAttachment from './attachments.js';
import defineCaseAttachment from './caseAttachments.js';
import defineCase from './cases.js';
import defineCaseStep from './caseSteps.js';
import defineCaseTag from './caseTags.js';
import defineComment from './comments.js';
import defineFolder from './folders.js';
import defineMember from './members.js';
import defineProject from './projects.js';
import defineRunCase from './runCases.js';
import defineRun from './runs.js';
import defineStep from './steps.js';
import defineTag from './tags.js';
import defineUser from './users.js';

describe('model table names', () => {
  function defineAllModels() {
    const sequelize = new Sequelize('postgres://user:pass@localhost:5432/unittcms', { dialect: 'postgres', logging: false });
    const db = {
      Attachment: defineAttachment(sequelize, DataTypes),
      CaseAttachment: defineCaseAttachment(sequelize, DataTypes),
      Case: defineCase(sequelize, DataTypes),
      CaseStep: defineCaseStep(sequelize, DataTypes),
      caseTags: defineCaseTag(sequelize, DataTypes),
      Comment: defineComment(sequelize, DataTypes),
      Folder: defineFolder(sequelize, DataTypes),
      Member: defineMember(sequelize, DataTypes),
      Project: defineProject(sequelize, DataTypes),
      RunCase: defineRunCase(sequelize, DataTypes),
      Run: defineRun(sequelize, DataTypes),
      Step: defineStep(sequelize, DataTypes),
      Tags: defineTag(sequelize, DataTypes),
      User: defineUser(sequelize, DataTypes),
    };

    for (const model of Object.values(db)) {
      model.associate?.(db);
    }

    return db;
  }

  it('matches the migration table names for Postgres', () => {
    const sequelize = new Sequelize('postgres://user:pass@localhost:5432/unittcms', { dialect: 'postgres', logging: false });
    const models = [
      [defineAttachment, 'attachments'],
      [defineCaseAttachment, 'caseAttachments'],
      [defineCase, 'cases'],
      [defineCaseStep, 'caseSteps'],
      [defineCaseTag, 'caseTags'],
      [defineComment, 'comments'],
      [defineFolder, 'folders'],
      [defineMember, 'members'],
      [defineProject, 'projects'],
      [defineRunCase, 'runCases'],
      [defineRun, 'runs'],
      [defineStep, 'steps'],
      [defineTag, 'tags'],
      [defineUser, 'users'],
    ];

    for (const [defineModel, tableName] of models) {
      expect(defineModel(sequelize, DataTypes).getTableName()).toBe(tableName);
    }
  });

  it('does not add duplicate default foreign keys to join tables', () => {
    const db = defineAllModels();

    expect(Object.keys(db.CaseStep.rawAttributes)).toEqual(
      expect.arrayContaining(['caseId', 'stepId'])
    );
    expect(Object.keys(db.CaseStep.rawAttributes)).not.toEqual(
      expect.arrayContaining(['CaseId', 'StepId'])
    );
    expect(Object.keys(db.CaseAttachment.rawAttributes)).toEqual(
      expect.arrayContaining(['caseId', 'attachmentId'])
    );
    expect(Object.keys(db.CaseAttachment.rawAttributes)).not.toEqual(
      expect.arrayContaining(['CaseId', 'AttachmentId'])
    );
  });

  it('uses text columns for case content and step details', () => {
    const sequelize = new Sequelize({ dialect: 'sqlite', logging: false });
    const Case = defineCase(sequelize, DataTypes);
    const Step = defineStep(sequelize, DataTypes);

    expect(Case.rawAttributes.description.type.key).toBe('TEXT');
    expect(Case.rawAttributes.preConditions.type.key).toBe('TEXT');
    expect(Case.rawAttributes.expectedResults.type.key).toBe('TEXT');
    expect(Step.rawAttributes.step.type.key).toBe('TEXT');
    expect(Step.rawAttributes.result.type.key).toBe('TEXT');
  });
});
