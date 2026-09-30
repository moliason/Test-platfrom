import fs from 'fs';
import path from 'path';

export async function up(queryInterface) {
  const [attachments] = await queryInterface.sequelize.query('SELECT id, title, filename FROM attachments');
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');

  for (const attachment of attachments) {
    const title = decodeFileName(attachment.title);
    const filename = decodeFileName(attachment.filename);

    if (attachment.filename !== filename) {
      const oldPath = path.join(uploadDir, attachment.filename);
      const newPath = path.join(uploadDir, filename);
      if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
        fs.renameSync(oldPath, newPath);
      }
    }

    if (attachment.title !== title || attachment.filename !== filename) {
      await queryInterface.bulkUpdate('attachments', { title, filename }, { id: attachment.id });
    }
  }
}

export async function down() {}

function decodeFileName(fileName) {
  if (!fileName || !/[\u0080-\u00ff]/.test(fileName)) {
    return fileName;
  }

  const decoded = Buffer.from(fileName, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? fileName : decoded;
}
