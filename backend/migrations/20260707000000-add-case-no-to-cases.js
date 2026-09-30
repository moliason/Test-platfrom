export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('cases', 'caseNo', {
    type: Sequelize.INTEGER,
    allowNull: true,
  });

  if (queryInterface.sequelize.getDialect() === 'postgres') {
    await queryInterface.sequelize.query(`
      UPDATE cases c
      SET "caseNo" = ranked."caseNo"
      FROM (
        SELECT c.id, ROW_NUMBER() OVER (PARTITION BY f."projectId" ORDER BY c.id) AS "caseNo"
        FROM cases c
        INNER JOIN folders f ON c."folderId" = f.id
      ) ranked
      WHERE c.id = ranked.id
    `);
  } else {
    const [rows] = await queryInterface.sequelize.query(`
      SELECT c.id, f."projectId"
      FROM cases c
      INNER JOIN folders f ON c."folderId" = f.id
      ORDER BY f."projectId", c.id
    `);
    const projectCounts = new Map();
    for (const row of rows) {
      const projectId = row.projectId;
      const nextNo = (projectCounts.get(projectId) || 0) + 1;
      projectCounts.set(projectId, nextNo);
      await queryInterface.bulkUpdate('cases', { caseNo: nextNo }, { id: row.id });
    }
  }

  await queryInterface.changeColumn('cases', 'caseNo', {
    type: Sequelize.INTEGER,
    allowNull: false,
  });

  await queryInterface.addIndex('cases', ['caseNo'], {
    name: 'cases_case_no_idx',
  });
}

export async function down(queryInterface) {
  await queryInterface.removeIndex('cases', 'cases_case_no_idx');
  await queryInterface.removeColumn('cases', 'caseNo');
}
