const fs = require('fs');
const path = require('path');
const IStorageProvider = require('./IStorageProvider');

class LocalStorageProvider extends IStorageProvider {
  constructor(baseDir = path.join(__dirname, '../../uploads/resumes')) {
    super();
    this.baseDir = baseDir;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async uploadFile({ buffer, originalFilename, mimeType, userId, documentId }) {
    const ext = path.extname(originalFilename).toLowerCase();
    const safeFilename = `${documentId}${ext}`;
    const filePath = path.join(this.baseDir, safeFilename);

    await fs.promises.writeFile(filePath, buffer);

    return {
      storageId: safeFilename,
      documentId,
      storageType: 'local',
      fileSize: buffer.length
    };
  }

  async getFileStream(storageId, userId) {
    const filePath = path.join(this.baseDir, storageId);
    if (!fs.existsSync(filePath)) {
      throw new Error('Document not found in storage.');
    }
    return fs.createReadStream(filePath);
  }

  async getFileBuffer(storageId, userId) {
    const filePath = path.join(this.baseDir, storageId);
    if (!fs.existsSync(filePath)) {
      throw new Error('Document not found in storage.');
    }
    return fs.promises.readFile(filePath);
  }

  async deleteFile(storageId, userId) {
    const filePath = path.join(this.baseDir, storageId);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  }
}

module.exports = LocalStorageProvider;
