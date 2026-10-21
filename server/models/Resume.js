const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, default: null },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    github: { type: String, default: null },
    linkedin: { type: String, default: null },
    leetcode: { type: String, default: null },
    portfolio: { type: String, default: null }
  },
  { _id: false }
);

const educationSchema = new mongoose.Schema(
  {
    institution: { type: String, default: null },
    degree: { type: String, default: null },
    field: { type: String, default: null },
    graduationYear: { type: String, default: null },
    score: { type: String, default: null }
  },
  { _id: false }
);

const experienceSchema = new mongoose.Schema(
  {
    company: { type: String, default: null },
    role: { type: String, default: null },
    duration: { type: String, default: null },
    responsibilities: [{ type: String }]
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: null },
    techStack: [{ type: String }],
    githubLink: { type: String, default: null },
    liveLink: { type: String, default: null },
    impact: { type: String, default: null },
    highlights: [{ type: String }]
  },
  { _id: false }
);

const skillsSchema = new mongoose.Schema(
  {
    languages: [{ type: String }],
    frameworks: [{ type: String }],
    databases: [{ type: String }],
    cloud: [{ type: String }],
    tools: [{ type: String }],
    other: [{ type: String }],
    allSkills: [{ type: String }]
  },
  { _id: false }
);

const structuredDataSchema = new mongoose.Schema(
  {
    contact: { type: contactSchema, default: () => ({}) },
    summary: { type: String, default: null },
    education: [educationSchema],
    experience: [experienceSchema],
    projects: [projectSchema],
    skills: { type: skillsSchema, default: () => ({}) },
    achievements: [{ type: String }],
    links: [{ type: String }]
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    documentId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true
    },
    storedFilename: {
      type: String,
      trim: true
    },
    storageId: {
      type: String
    },
    storageType: {
      type: String,
      enum: ['gridfs', 'local', 's3'],
      default: 'gridfs'
    },
    storagePath: {
      type: String
    },
    mimeType: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      enum: ['pdf', 'docx'],
      default: 'pdf'
    },
    fileSize: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['uploaded', 'processing', 'processed', 'failed'],
      default: 'uploaded',
      index: true
    },
    errorMessage: {
      type: String,
      default: null
    },
    pageCount: {
      type: Number,
      default: 1
    },
    visualConfidence: {
      type: Number,
      default: 1.0
    },
    layoutAnomalies: [{ type: String }],
    extractedText: {
      type: String,
      default: ''
    },
    cleanText: {
      type: String,
      default: ''
    },
    structuredData: {
      type: structuredDataSchema,
      default: () => ({})
    },
    processedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

resumeSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Resume = mongoose.model('Resume', resumeSchema);

module.exports = Resume;
