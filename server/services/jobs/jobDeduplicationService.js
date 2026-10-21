const Job = require('../../models/Job');

class JobDeduplicationService {
  /**
   * Check if a job already exists in the database
   * @param {Object} rawJob
   * @returns {Promise<Job|null>}
   */
  async findDuplicate(rawJob) {
    // 1. Check externalId match if available
    if (rawJob.externalId && rawJob.sourceType) {
      const matchByExternalId = await Job.findOne({
        sourceType: rawJob.sourceType,
        externalId: String(rawJob.externalId)
      });
      if (matchByExternalId) return matchByExternalId;
    }

    // 2. Check canonical applyUrl match
    if (rawJob.applyUrl) {
      const matchByUrl = await Job.findOne({
        applyUrl: rawJob.applyUrl.trim()
      });
      if (matchByUrl) return matchByUrl;
    }

    // 3. Fallback match by exact company + title
    if (rawJob.company && rawJob.title) {
      const matchByCompanyAndTitle = await Job.findOne({
        company: new RegExp(`^${rawJob.company.trim()}$`, 'i'),
        title: new RegExp(`^${rawJob.title.trim()}$`, 'i')
      });
      if (matchByCompanyAndTitle) return matchByCompanyAndTitle;
    }

    return null;
  }
}

module.exports = new JobDeduplicationService();
