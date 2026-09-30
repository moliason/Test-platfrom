export async function up(queryInterface) {
  await queryInterface.renameColumn('attachments', 'path', 'filename');
}

export async function down(queryInterface) {
  await queryInterface.renameColumn('attachments', 'filename', 'path');
}
