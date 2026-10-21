const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['Saved', 'Applied', 'Shortlisted', 'Interview', 'Offer', 'Rejected'],
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    note: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true
    },
    jobSnapshot: {
      title: { type: String, required: true },
      company: { type: String, required: true },
      location: { type: String, default: 'Remote' },
      applyUrl: { type: String, required: true },
      workplaceType: { type: String, default: 'remote' },
      employmentType: { type: String, default: 'full-time' }
    },
    status: {
      type: String,
      enum: ['Saved', 'Applied', 'Shortlisted', 'Interview', 'Offer', 'Rejected'],
      default: 'Saved',
      index: true
    },
    savedAt: {
      type: Date,
      default: Date.now
    },
    appliedAt: {
      type: Date,
      default: null
    },
    followUpDate: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      default: ''
    },
    statusHistory: [statusHistorySchema]
  },
  {
    timestamps: true
  }
);

// Prevent duplicate application tracking records for the same student and job
applicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });
applicationSchema.index({ userId: 1, status: 1 });
applicationSchema.index({ userId: 1, followUpDate: 1 });

applicationSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;
