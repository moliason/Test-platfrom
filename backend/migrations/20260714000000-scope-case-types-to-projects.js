export async function up(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.addColumn(
      'caseTypes',
      'projectId',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'projects',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      { transaction }
    );

    await queryInterface.removeConstraint('caseTypes', 'caseTypes_name_key', { transaction });

    const builtInCount = (process.env.TEST_TYPES || '\u529f\u80fd,\u6027\u80fd,\u5065\u58ee\u6027,\u7a33\u5b9a\u6027')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean).length;
    const projects = await queryInterface.sequelize.query('SELECT id FROM "projects"', {
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    });
    const customTypes = await queryInterface.sequelize.query(
      'SELECT name, "sortOrder", "createdAt", "updatedAt" FROM "caseTypes" WHERE "sortOrder" >= :builtInCount',
      {
        replacements: { builtInCount },
        type: Sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    if (projects.length > 0 && customTypes.length > 0) {
      await queryInterface.bulkInsert(
        'caseTypes',
        projects.flatMap((project) =>
          customTypes.map((caseType) => ({
            ...caseType,
            projectId: project.id,
          }))
        ),
        { transaction }
      );
    }

    await queryInterface.bulkDelete(
      'caseTypes',
      {
        sortOrder: { [Sequelize.Op.gte]: builtInCount },
        projectId: null,
      },
      { transaction }
    );

    await queryInterface.addIndex('caseTypes', ['projectId', 'name'], {
      name: 'case_types_project_name_unique',
      unique: true,
      transaction,
    });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.removeIndex('caseTypes', 'case_types_project_name_unique', { transaction });
    await queryInterface.bulkDelete('caseTypes', { projectId: { [Sequelize.Op.ne]: null } }, { transaction });
    await queryInterface.removeColumn('caseTypes', 'projectId', { transaction });
    await queryInterface.addConstraint('caseTypes', {
      fields: ['name'],
      type: 'unique',
      name: 'caseTypes_name_key',
      transaction,
    });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
