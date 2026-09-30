import { DataTypes, Op } from 'sequelize';
import defineCaseType from '../models/caseTypes.js';
import { testTypes } from '../config/enums.js';

async function getCaseTypeNames(sequelize, projectId) {
  const CaseType = defineCaseType(sequelize, DataTypes);
  const caseTypes = await CaseType.findAll({
    where: {
      [Op.or]: [{ projectId: null }, { projectId: Number(projectId) }],
    },
    order: [
      ['sortOrder', 'ASC'],
      ['id', 'ASC'],
    ],
  });

  if (caseTypes.length === 0) {
    return testTypes;
  }

  const names = [];
  for (const caseType of caseTypes) {
    names[caseType.sortOrder] = caseType.name;
  }

  return names;
}

export { getCaseTypeNames };
