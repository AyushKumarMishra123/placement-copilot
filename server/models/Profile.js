const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    techStack: {
      type: [String],
      default: []
    },
    githubUrl: {
      type: String,
      trim: true,
      default: ''
    },
    liveUrl: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: true }
);

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    targetRole: {
      type: String,
      trim: true,
      default: ''
    },
    location: {
      type: String,
      trim: true,
      default: ''
    },
    skills: {
      type: [String],
      default: []
    },
    education: {
      type: String,
      trim: true,
      default: ''
    },
    github: {
      type: String,
      trim: true,
      default: ''
    },
    linkedin: {
      type: String,
      trim: true,
      default: ''
    },
    leetcode: {
      type: String,
      trim: true,
      default: ''
    },
    achievements: {
      type: [String],
      default: []
    },
    achievementsReviewed: {
      type: Boolean,
      default: false
    },
    projects: {
      type: [projectSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

profileSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;
