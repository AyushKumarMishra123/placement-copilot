const Profile = require('../../models/Profile');
const Resume = require('../../models/Resume');
const ResumeReview = require('../../models/ResumeReview');

class InterviewContextService {
  /**
   * Builds sanitized bounded context for student interview personalization
   * @param {string} userId
   * @param {string} targetRoleOverride
   * @returns {Promise<Object>}
   */
  async buildStudentContext(userId, targetRoleOverride = '') {
    const profile = await Profile.findOne({ userId });
    const activeResume = await Resume.findOne({ userId, status: 'processed' }).sort({ createdAt: -1 });

    let resumeReview = null;
    if (activeResume) {
      resumeReview = await ResumeReview.findOne({ resumeId: activeResume._id }).sort({ createdAt: -1 });
    }

    // Merge skills safely
    const skillsSet = new Set();
    if (profile?.skills && Array.isArray(profile.skills)) {
      profile.skills.forEach((s) => skillsSet.add(s.trim()));
    }
    if (activeResume?.parsedData?.sections?.skills?.allSkills) {
      activeResume.parsedData.sections.skills.allSkills.forEach((s) => skillsSet.add(s.trim()));
    }

    // Merge project records from Profile and Resume
    const projectSummaries = [];
    if (profile?.projects && profile.projects.length > 0) {
      for (const p of profile.projects.slice(0, 5)) {
        projectSummaries.push({
          name: p.name,
          techStack: p.techStack || [],
          description: p.description ? p.description.slice(0, 300) : ''
        });
      }
    } else if (activeResume?.parsedData?.sections?.projects) {
      for (const p of activeResume.parsedData.sections.projects.slice(0, 3)) {
        projectSummaries.push({
          name: p.name,
          techStack: p.techStack || [],
          description: p.highlights ? p.highlights.slice(0, 2).join('. ') : ''
        });
      }
    }

    const targetRole = targetRoleOverride || profile?.targetRole || 'Software Development Engineer';

    return {
      targetRole,
      skills: Array.from(skillsSet).slice(0, 15),
      projects: projectSummaries,
      recentWeaknesses: resumeReview?.weaknesses || [],
      resumeId: activeResume?._id ? activeResume._id.toString() : null
    };
  }
}

module.exports = new InterviewContextService();
