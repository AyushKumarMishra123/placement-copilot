/**
 * IStorageProvider Interface / Base Specification
 */
class IStorageProvider {
  /**
   * Upload file to storage
   * @param {Object} options
   * @param {Buffer} options.buffer
   * @param {string} options.originalFilename
   * @param {string} options.mimeType
   * @param {string} options.userId
   * @param {string} options.documentId
   * @returns {Promise<{ storageId: string, documentId: string, storageType: string, fileSize: number }>}
   */
  async uploadFile(options) {
    throw new Error('uploadFile() must be implemented by storage provider');
  }

  /**
   * Get file stream by storage ID with user ownership check
   * @param {string} storageId
   * @param {string} userId
   * @returns {Promise<ReadableStream>}
   */
  async getFileStream(storageId, userId) {
    throw new Error('getFileStream() must be implemented by storage provider');
  }

  /**
   * Get file buffer by storage ID with user ownership check
   * @param {string} storageId
   * @param {string} userId
   * @returns {Promise<Buffer>}
   */
  async getFileBuffer(storageId, userId) {
    throw new Error('getFileBuffer() must be implemented by storage provider');
  }

  /**
   * Delete file from storage
   * @param {string} storageId
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  async deleteFile(storageId, userId) {
    throw new Error('deleteFile() must be implemented by storage provider');
  }
}

module.exports = IStorageProvider;
