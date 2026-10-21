/**
 * Service to parse and normalize raw external listings (Greenhouse, Lever, etc.)
 */
class JobNormalizationService {
  /**
   * Common software engineering skill dictionary for extraction
   */
  constructor() {
    this.knownSkills = [
      'javascript', 'typescript', 'react', 'next.js', 'vue', 'angular',
      'node.js', 'express', 'python', 'django', 'fastapi', 'flask',
      'java', 'spring', 'spring boot', 'c++', 'c#', '.net', 'golang', 'rust',
      'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
      'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'ci/cd', 'git',
      'graphql', 'rest api', 'microservices', 'html', 'css', 'tailwind',
      'data structures', 'algorithms', 'sql', 'nosql', 'linux', 'kafka'
    ];
  }

  /**
   * Extract skills from text
   * @param {string} text
   * @returns {string[]}
   */
  extractSkills(text) {
    if (!text || typeof text !== 'string') return [];
    const lower = text.toLowerCase();
    const matched = [];

    for (const skill of this.knownSkills) {
      // Escape for regex
      const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i');
      if (regex.test(lower)) {
        // Format nicely
        const formatted = skill
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        matched.push(formatted);
      }
    }
    return matched;
  }

  /**
   * Detect workplace type (remote, hybrid, on-site)
   */
  detectWorkplaceType(locationText = '', descriptionText = '') {
    const combined = `${locationText} ${descriptionText}`.toLowerCase();
    if (combined.includes('remote') || combined.includes('work from home')) {
      return 'remote';
    }
    if (combined.includes('hybrid')) {
      return 'hybrid';
    }
    return 'on-site';
  }

  /**
   * Detect employment type
   */
  detectEmploymentType(titleText = '', descriptionText = '') {
    const combined = `${titleText} ${descriptionText}`.toLowerCase();
    if (combined.includes('intern') || combined.includes('internship') || combined.includes('trainee')) {
      return 'internship';
    }
    if (combined.includes('contract') || combined.includes('contractor')) {
      return 'contract';
    }
    if (combined.includes('part-time') || combined.includes('part time')) {
      return 'part-time';
    }
    return 'full-time';
  }

  /**
   * Strip HTML tags from descriptions
   */
  cleanDescription(htmlOrText = '') {
    if (!htmlOrText) return '';
    return htmlOrText
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
}

module.exports = new JobNormalizationService();
