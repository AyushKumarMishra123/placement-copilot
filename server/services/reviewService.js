const Resume = require('../models/Resume');
const ResumeReview = require('../models/ResumeReview');
const pythonParserClient = require('./pythonParserClient');
const benchmarkEngine = require('./review/benchmarkEngine');
const scoringEngine = require('./review/scoringEngine');
const { getAIProvider } = require('./ai');
const { getStorageProvider } = require('./storage');

class ReviewService {
  /**
   * Process and analyze an uploaded resume document end-to-end
   * @param {Object} options
   * @param {string} options.resumeId - Mongo ID of Resume record
   * @param {string} options.userId - ID of student
   * @param {Buffer} [options.fileBuffer] - Optional in-memory buffer from upload
   * @returns {Promise<{ resume: Object, review: Object }>}
   */
  async processAndReviewResume({ resumeId, userId, fileBuffer = null }) {
    const resume = await Resume.findOne({ _id: resumeId, userId });
    if (!resume) {
      const err = new Error('Resume not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }

    try {
      // 1. Mark status as processing
      resume.status = 'processing';
      resume.errorMessage = null;
      await resume.save();

      // 2. Obtain file buffer if not already passed
      let buffer = fileBuffer;
      if (!buffer) {
        const storage = getStorageProvider();
        buffer = await storage.getFileBuffer(resume.storageId, userId);
      }

      // 3. Send to Python Document Processing Service
      const parsedData = await pythonParserClient.parseResume(
        buffer,
        resume.originalFilename,
        resume.mimeType
      );

      // 4. Update Resume record with parsed structured data
      resume.pageCount = parsedData.pageCount || 1;
      resume.visualConfidence = parsedData.layout?.confidence ?? 1.0;
      resume.layoutAnomalies = parsedData.layout?.layoutAnomalies || [];
      resume.extractedText = parsedData.text || '';
      resume.cleanText = parsedData.cleanText || '';
      resume.structuredData = parsedData.sections || {};
      resume.fileType = parsedData.fileType || (resume.originalFilename.endsWith('.docx') ? 'docx' : 'pdf');
      resume.status = 'processed';
      resume.processedAt = new Date();
      await resume.save();

      // 5. Run deterministic benchmark checks
      const checks = benchmarkEngine.runChecks(parsedData);

      // 6. Calculate deterministic score and category breakdown
      const { score, categoryScores } = scoringEngine.calculateScore(checks);

      // 7. Run AI review of content
      const aiProvider = getAIProvider();
      const aiReview = await aiProvider.reviewResume({
        parsedResume: parsedData,
        checks,
        score
      });

      // 8. Enhance checks with AI refined suggestions where available
      if (aiReview.refinedSuggestions) {
        for (const check of checks) {
          if (aiReview.refinedSuggestions[check.id]) {
            check.suggestion = aiReview.refinedSuggestions[check.id];
            check.source = 'combined';
          }
        }
      }

      // 9. Check version count for this resume
      const previousReviewsCount = await ResumeReview.countDocuments({
        resumeId: resume._id,
        userId
      });
      const version = previousReviewsCount + 1;

      // 10. Store review in database
      const review = await ResumeReview.create({
        userId,
        resumeId: resume._id,
        version,
        score,
        categoryScores,
        checks,
        strengths: aiReview.strengths,
        weaknesses: aiReview.weaknesses,
        recommendations: aiReview.recommendations,
        summary: aiReview.summary,
        aiReviewGenerated: Boolean(aiReview),
        aiProvider: aiReview.provider
      });

      return {
        resume,
        review
      };
    } catch (err) {
      console.error(`[ReviewService Error] Failed processing resume ${resumeId}:`, err);
      resume.status = 'failed';
      resume.errorMessage = err.message || 'Processing failed';
      await resume.save();
      throw err;
    }
  }

  /**
   * Get latest review for a resume
   */
  async getLatestReview(resumeId, userId) {
    return ResumeReview.findOne({ resumeId, userId }).sort({ createdAt: -1 });
  }

  /**
   * Get all reviews history for a resume
   */
  async getReviewHistory(resumeId, userId) {
    return ResumeReview.find({ resumeId, userId }).sort({ createdAt: -1 });
  }
}

module.exports = new ReviewService();
