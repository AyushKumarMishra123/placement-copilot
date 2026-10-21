const { z } = require('zod');

const projectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required'),
  description: z.string().trim().optional().default(''),
  techStack: z
    .array(z.string().trim())
    .or(z.string().transform((val) => val.split(',').map((s) => s.trim()).filter(Boolean)))
    .optional()
    .default([]),
  githubUrl: z.string().trim().optional().default(''),
  liveUrl: z.string().trim().optional().default('')
});

const profileSchema = z.object({
  targetRole: z.string().trim().optional().default(''),
  location: z.string().trim().optional().default(''),
  skills: z
    .array(z.string().trim())
    .or(z.string().transform((val) => val.split(',').map((s) => s.trim()).filter(Boolean)))
    .optional()
    .default([]),
  education: z.string().trim().optional().default(''),
  github: z.string().trim().optional().default(''),
  linkedin: z.string().trim().optional().default(''),
  leetcode: z.string().trim().optional().default(''),
  achievements: z
    .array(z.string().trim())
    .or(z.string().transform((val) => val.split('\n').map((s) => s.trim()).filter(Boolean)))
    .optional()
    .default([]),
  achievementsReviewed: z.boolean().optional().default(false),
  projects: z.array(projectSchema).optional().default([])
});

module.exports = {
  profileSchema,
  projectSchema
};
