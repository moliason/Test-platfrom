function defineCaseType(sequelize, DataTypes) {
  return sequelize.define(
    'CaseType',
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      projectId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'projects',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
    },
    { tableName: 'caseTypes' }
  );
}

export default defineCaseType;
