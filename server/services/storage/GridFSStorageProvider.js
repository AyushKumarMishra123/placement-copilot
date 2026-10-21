const mongoose = require('mongoose');
const { Readable } = require('stream');
const IStorageProvider = require('./IStorageProvider');

class GridFSStorageProvider extends IStorageProvider {
  constructor(bucketName = 'resumes') {
    super();
    this.bucketName = bucketName;
  }

  getBucket() {
    if (!mongoose.connection.db) {
      throw new Error('MongoDB connection is not established yet. GridFS cannot initialize.');
    }
    return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: this.bucketName
    });
  }

  async uploadFile({ buffer, originalFilename, mimeType, userId, documentId }) {
    const bucket = this.getBucket();

    return new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(documentId, {
        metadata: {
          userId: userId.toString(),
          documentId,
          originalFilename,
          mimeType,
          uploadedAt: new Date()
        }
      });

      const readableStream = Readable.from(buffer);

      uploadStream.on('error', (err) => {
        reject(err);
      });

      uploadStream.on('finish', () => {
        resolve({
          storageId: uploadStream.id.toString(),
          documentId,
          storageType: 'gridfs',
          fileSize: buffer.length
        });
      });

      readableStream.pipe(uploadStream);
    });
  }

  async getFileStream(storageId, userId, isAdmin = false) {
    const bucket = this.getBucket();
    const objectId = new mongoose.Types.ObjectId(storageId);

    // Verify document existence
    const files = await bucket.find({ _id: objectId }).toArray();
    if (!files || files.length === 0) {
      throw new Error('Document not found in storage.');
    }

    const file = files[0];
    // If not admin, verify ownership
    if (!isAdmin && file.metadata?.userId && file.metadata.userId !== userId.toString()) {
      const error = new Error('Access denied: Unauthorized access to document.');
      error.statusCode = 403;
      throw error;
    }

    return bucket.openDownloadStream(objectId);
  }

  async getFileBuffer(storageId, userId) {
    const stream = await this.getFileStream(storageId, userId);
    const chunks = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async deleteFile(storageId, userId) {
    const bucket = this.getBucket();
    const objectId = new mongoose.Types.ObjectId(storageId);

    const files = await bucket.find({ _id: objectId }).toArray();
    if (!files || files.length === 0) {
      return false;
    }

    const file = files[0];
    if (file.metadata?.userId && file.metadata.userId !== userId.toString()) {
      const error = new Error('Access denied: Unauthorized access to document.');
      error.statusCode = 403;
      throw error;
    }

    await bucket.delete(objectId);
    return true;
  }
}

module.exports = GridFSStorageProvider;
