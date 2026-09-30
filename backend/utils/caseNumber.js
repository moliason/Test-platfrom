import { QueryTypes } from 'sequelize';

async function getNextProjectCaseNo(sequelize, Folder, folderId, transaction) {
  const folder = await Folder.findByPk(folderId, { transaction });
  if (!folder) {
    const error = new Error('Folder not found');
    error.statusCode = 404;
    throw error;
  }

  const rows = await sequelize.query(
    `
      SELECT COALESCE(MAX(c."caseNo"), 0) AS "maxCaseNo"
      FROM cases c
      INNER JOIN folders f ON c."folderId" = f.id
      WHERE f."projectId" = :projectId
    `,
    {
      replacements: { projectId: folder.projectId },
      transaction,
      type: QueryTypes.SELECT,
    }
  );

  const maxCaseNo = rows[0]?.maxCaseNo ?? rows[0]?.maxcaseno ?? 0;
  return Number(maxCaseNo) + 1;
}

export { getNextProjectCaseNo };
