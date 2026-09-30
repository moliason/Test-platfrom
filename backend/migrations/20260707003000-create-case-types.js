export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('caseTypes', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    sortOrder: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    createdAt: {
      allowNull: false,
      type: Sequelize.DATE,
    },
    updatedAt: {
      allowNull: false,
      type: Sequelize.DATE,
    },
  });

  const now = new Date();
  const names = (process.env.TEST_TYPES || '\u529f\u80fd,\u6027\u80fd,\u5065\u58ee\u6027,\u7a33\u5b9a\u6027')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  await queryInterface.bulkInsert(
    'caseTypes',
    names.map((name, index) => ({
      name,
      sortOrder: index,
      createdAt: now,
      updatedAt: now,
    }))
  );
}

export async function down(queryInterface) {
  await queryInterface.dropTable('caseTypes');
}
