const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    adminEmail: {
      type: String,
      required: true,
      trim: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null
    },
    studentEmail: {
      type: String,
      trim: true,
      default: null
    },
    resourceType: {
      type: String,
      required: true,
      enum: [
        'overview',
        'students',
        'student_detail',
        'readiness',
        'resume',
        'resume_download',
        'linkedin',
        'github',
        'project',
        'interview',
        'coding',
        'job',
        'application',
        'audit'
      ],
      index: true
    },
    action: {
      type: String,
      required: true,
      trim: true
    },
    // Strictly metadata: document IDs, resource keys, query filters.
    // NEVER full text, NEVER resumes, NEVER interview transcripts.
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    },
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ studentId: 1, createdAt: -1 });

auditLogSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
