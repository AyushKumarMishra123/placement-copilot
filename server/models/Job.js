const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      index: true
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Job description is required']
    },
    location: {
      type: String,
      default: 'Remote',
      trim: true
    },
    workplaceType: {
      type: String,
      enum: ['remote', 'hybrid', 'on-site'],
      default: 'remote',
      index: true
    },
    employmentType: {
      type: String,
      enum: ['full-time', 'internship', 'part-time', 'contract'],
      default: 'full-time',
      index: true
    },
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'internship', 'all'],
      default: 'entry',
      index: true
    },
    targetRoles: [
      {
        type: String,
        trim: true
      }
    ],
    requiredSkills: [
      {
        type: String,
        trim: true
      }
    ],
    preferredSkills: [
      {
        type: String,
        trim: true
      }
    ],
    minimumQualifications: [
      {
        type: String,
        trim: true
      }
    ],
    salary: {
      type: String,
      default: ''
    },
    currency: {
      type: String,
      default: 'INR'
    },
    applyUrl: {
      type: String,
      required: [true, 'Application URL or instructions required'],
      trim: true
    },
    sourceType: {
      type: String,
      enum: ['admin', 'greenhouse', 'lever', 'external_feed', 'serpapi'],
      default: 'admin',
      index: true
    },
    sourceName: {
      type: String,
      default: 'Campus Placement / MSOT'
    },
    externalId: {
      type: String,
      sparse: true,
      index: true
    },
    sourceUrl: {
      type: String,
      default: ''
    },
    thumbnail: {
      type: String,
      default: ''
    },
    via: {
      type: String,
      default: ''
    },
    shareLink: {
      type: String,
      default: ''
    },
    applyOptions: [
      {
        title: { type: String, default: '' },
        link: { type: String, default: '' }
      }
    ],
    publishedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    closingDate: {
      type: Date,
      default: null
    },
    lastVerifiedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound index for active job discovery and dedup checks
jobSchema.index({ isActive: 1, publishedAt: -1 });
jobSchema.index({ company: 1, title: 1, externalId: 1 });

jobSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
