import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import express from 'express';
const router = express.Router();
import { DataTypes } from 'sequelize';
import defineAttachment from '../../models/attachments.js';
import defineCaseAttachment from '../../models/caseAttachments.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function (sequelize) {
  const Attachment = defineAttachment(sequelize, DataTypes);
  const CaseAttachment = defineCaseAttachment(sequelize, DataTypes);

  // Create uploads folder if it does not exist
  const uploadDir = path.join(__dirname, '../../public/uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: async (req, file, cb) => {
      const originalName = decodeUploadFileName(file.originalname);
      const ext = path.extname(originalName);
      const baseName = path.basename(originalName, ext);
      let fileName = `${baseName}${ext}`;

      // Check if a file with the same name already exists
      let fileExists = true;
      let fileIndex = 1;
      while (fileExists) {
        const filePath = path.join(uploadDir, fileName);
        if (fs.existsSync(filePath)) {
          // If a file with the same name exists, add an index and rename the file
          fileName = `${baseName}_${fileIndex}${ext}`;
          fileIndex++;
        } else {
          fileExists = false;
        }
      }

      cb(null, fileName);
    },
  });

  const upload = multer({ storage });

  // TODO middleware to verify user permission to upload files
  router.post('/', upload.array('files', 10), async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const caseId = req.query.parentCaseId;
      const files = req.files;
      if (files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const attachmentsData = files.map((file) => ({
        title: decodeUploadFileName(file.originalname),
        filename: file.filename,
      }));

      const newAttachments = await Attachment.bulkCreate(attachmentsData, {
        transaction: t,
      });

      const caseAttachmentsData = newAttachments.map((attachment) => ({
        caseId: caseId,
        attachmentId: attachment.id,
      }));
      await CaseAttachment.bulkCreate(caseAttachmentsData, { transaction: t });
      await t.commit();
      res.json(newAttachments);
    } catch (error) {
      console.error(error);
      await t.rollback();
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

function decodeUploadFileName(fileName) {
  if (!/[\u0080-\u00ff]/.test(fileName)) {
    return fileName;
  }

  const decoded = Buffer.from(fileName, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? fileName : decoded;
}
