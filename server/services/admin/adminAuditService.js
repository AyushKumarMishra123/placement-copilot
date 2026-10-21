const AuditLog = require('../../models/AuditLog');

/**
 * Audit Logging Service
 * Records administrative access to student records.
 * Strictly adheres to privacy requirements: NEVER logs full resume text or interview transcripts.
 */
class AdminAuditService {
  /**
   * Log an administrative access or mutation event
   * @param {Object} params
   * @param {Object} params.req - Express request object
   * @param {string|ObjectId} [params.studentId] - Target student ID
   * @param {string} [params.studentEmail] - Target student email
   * @param {string} params.resourceType - Type of resource accessed
   * @param {string} params.action - Description of action performed
   * @param {Object} [params.details] - Non-sensitive metadata (IDs, counts, query filters)
   */
  async log({ req, studentId = null, studentEmail = null, resourceType, action, details = {} }) {
    try {
      if (!req || !req.user) return;

      // Sanitize details to ensure NO sensitive contents are persisted
      const sanitizedDetails = this._sanitizeDetails(details);

      await AuditLog.create({
        adminId: req.user.id,
        adminEmail: req.user.email,
        studentId: studentId || null,
        studentEmail: studentEmail || null,
        resourceType,
        action,
        details: sanitizedDetails,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
        userAgent: req.headers['user-agent'] || ''
      });
    } catch (err) {
      // Never let audit logging failure crash the primary API response
      console.warn('[Admin Audit Service Error]', err.message);
    }
  }

  /**
   * Sanitizes details object by removing full text, transcripts, and resumes
   * @private
   */
  _sanitizeDetails(details) {
    if (!details || typeof details !== 'object') return {};

    const prohibitedKeys = [
      'extractedText',
      'cleanText',
      'transcript',
      'code',
      'password',
      'passwordHash',
      'buffer',
      'fileBuffer',
      'resumeText'
    ];

    const clean = {};
    for (const [key, value] of Object.entries(details)) {
      if (prohibitedKeys.includes(key)) {
        clean[key] = '[REDACTED_SENSITIVE_CONTENT]';
      } else if (typeof value === 'object' && value !== null) {
        clean[key] = this._sanitizeDetails(value);
      } else {
        clean[key] = value;
      }
    }
    return clean;
  }
}

module.exports = new AdminAuditService();
