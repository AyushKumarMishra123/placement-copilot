const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// 5 MB file size limit
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.doc']);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  const isExtAllowed = ALLOWED_EXTENSIONS.has(ext);
  const isMimeAllowed = ALLOWED_MIME_TYPES.has(file.mimetype);

  if (!isExtAllowed || !isMimeAllowed) {
    const error = new Error('Invalid file type. Only PDF and DOCX documents are accepted.');
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }

  cb(null, true);
};

const uploadResume = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter
}).single('resume');

// Wrapper middleware to handle Multer errors cleanly in standard JSON format
const handleResumeUpload = (req, res, next) => {
  uploadResume(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds the 5MB limit.',
            code: 'FILE_TOO_LARGE'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
          code: 'UPLOAD_ERROR'
        });
      }

      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          success: false,
          message: err.message,
          code: 'INVALID_FILE_TYPE'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'An error occurred during file upload.',
        code: 'UPLOAD_FAILED'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No resume file uploaded. Please attach a file under the "resume" field.',
        code: 'MISSING_FILE'
      });
    }

    // Attach unique identifier and sanitized metadata
    const documentId = crypto.randomUUID();
    const ext = path.extname(req.file.originalname).toLowerCase();
    req.file.documentId = documentId;
    req.file.storedFilename = `${documentId}${ext}`;

    next();
  });
};

module.exports = {
  handleResumeUpload,
  MAX_FILE_SIZE
};
