const { z } = require('zod');

const startInterviewSchema = z.object({
  targetRole: z
    .string({ required_error: 'Target job role is required' })
    .trim()
    .min(2, 'Target role must be at least 2 characters')
    .max(100, 'Target role must be at most 100 characters'),
  durationMinutes: z
    .number()
    .int()
    .refine((val) => [15, 20].includes(val), {
      message: 'Interview duration must be either 15 or 20 minutes'
    })
    .optional()
    .default(15),
  focus: z
    .string()
    .trim()
    .max(100)
    .optional()
    .default('general')
});

const submitAnswerSchema = z.object({
  questionId: z
    .string({ required_error: 'Question identifier is required' })
    .trim()
    .min(1, 'Question ID cannot be empty'),
  answerText: z
    .string({ required_error: 'Answer text is required' })
    .trim()
    .min(1, 'Answer text cannot be empty')
    .max(10000, 'Answer is too long (maximum 10,000 characters)')
});

const skipQuestionSchema = z.object({
  questionId: z
    .string({ required_error: 'Question identifier is required' })
    .trim()
    .min(1, 'Question ID cannot be empty')
});

module.exports = {
  startInterviewSchema,
  submitAnswerSchema,
  skipQuestionSchema
};
