export async function up(queryInterface) {
  const quote = queryInterface.sequelize.getDialect() === 'postgres' ? '"' : '`';
  const typeColumn = `${quote}type${quote}`;

  await queryInterface.sequelize.query(`
    UPDATE cases
    SET ${typeColumn} = CASE
      WHEN ${typeColumn} = 2 THEN 1
      WHEN ${typeColumn} = 4 THEN 0
      ELSE 0
    END
  `);
}

export async function down() {}
