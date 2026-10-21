/**
 * Parses LinkedIn Profile PDF (downloaded via LinkedIn "Save to PDF")
 * into normalized structured profileData.
 */
class LinkedInPdfParser {
  /**
   * Parse PDF buffer into structured profile sections
   * @param {Buffer} pdfBuffer
   * @returns {Promise<Object>}
   */
  async parse(pdfBuffer) {
    if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
      throw new Error('Valid PDF buffer is required');
    }

    let rawText = '';

    // 1. Try in-Node pdf-parse (handles both v2 PDFParse class and v1 function)
    try {
      const pdfParseModule = require('pdf-parse');
      if (pdfParseModule && typeof pdfParseModule.PDFParse === 'function') {
        const parser = new pdfParseModule.PDFParse({ data: pdfBuffer });
        const result = await parser.getText();
        await parser.destroy();
        rawText = result?.text || '';
      } else if (typeof pdfParseModule === 'function') {
        const result = await pdfParseModule(pdfBuffer);
        rawText = result?.text || '';
      } else if (pdfParseModule?.default && typeof pdfParseModule.default === 'function') {
        const result = await pdfParseModule.default(pdfBuffer);
        rawText = result?.text || '';
      }
    } catch (nodeErr) {
      // If in-Node extraction failed, attempt Python parser fallback if available
      try {
        const PythonParserClient = require('../pythonParserClient');
        const client = new PythonParserClient();
        const pyResult = await client.parseResume(pdfBuffer, 'linkedin_profile.pdf', 'application/pdf');
        rawText = pyResult.cleanText || pyResult.text || '';
      } catch (pyErr) {
        throw new Error(`Failed to parse PDF document: ${nodeErr.message || 'Corrupted or unreadable PDF'}`);
      }
    }

    if (!rawText.trim()) {
      throw new Error('PDF document contains no readable text or is password-protected.');
    }

    return this.extractProfileFromText(rawText);
  }


  /**
   * Extract sections from plain text extracted from LinkedIn PDF
   * @param {string} text
   * @returns {Object}
   */
  extractProfileFromText(text) {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const profileData = {
      fullName: '',
      headline: '',
      location: '',
      about: '',
      experience: [],
      projects: [],
      skills: [],
      education: [],
      certifications: [],
      featuredLinks: [],
      achievements: []
    };

    if (lines.length === 0) return profileData;

    // LinkedIn PDF structure:
    // Usually line 0 or 1 is the Full Name
    // Followed by Headline
    // Followed by Location
    // Then sections: Summary, Experience, Education, Top Skills, Certifications, Honors-Awards
    let currentSection = 'header';
    let summaryLines = [];
    let skillsLines = [];
    let experienceText = [];
    let educationText = [];
    let certText = [];
    let awardsText = [];

    const sectionHeaders = {
      'top skills': 'skills',
      'skills': 'skills',
      'summary': 'summary',
      'about': 'summary',
      'experience': 'experience',
      'education': 'education',
      'certifications': 'certifications',
      'licenses & certifications': 'certifications',
      'honors-awards': 'awards',
      'honors & awards': 'awards',
      'awards': 'awards',
      'projects': 'projects',
      'languages': 'languages'
    };

    // First scan header (before any recognized section header)
    let headerLines = [];
    let i = 0;
    for (; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      if (sectionHeaders[lineLower]) {
        currentSection = sectionHeaders[lineLower];
        i++;
        break;
      }
      headerLines.push(lines[i]);
    }

    if (headerLines.length > 0) {
      // Find candidate name (filter out Contact info or page numbers)
      const validHeader = headerLines.filter(
        (h) => !h.startsWith('Page ') && !h.includes('www.linkedin.com') && !h.includes('@')
      );
      if (validHeader[0]) profileData.fullName = validHeader[0];
      if (validHeader[1]) profileData.headline = validHeader[1];
      if (validHeader[2] && !validHeader[2].toLowerCase().includes('contact')) {
        profileData.location = validHeader[2];
      }
    }

    // Now scan through remaining lines and distribute by section
    for (; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();

      // Check if line is a section header
      if (sectionHeaders[lineLower]) {
        currentSection = sectionHeaders[lineLower];
        continue;
      }

      // Filter out footer artifacts
      if (line.startsWith('Page ') || line.includes('www.linkedin.com/in/')) {
        // extract profile URL if present
        const urlMatch = line.match(/https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
        if (urlMatch && !profileData.profileUrl) {
          profileData.profileUrl = urlMatch[0];
        }
        continue;
      }

      switch (currentSection) {
        case 'summary':
          summaryLines.push(line);
          break;
        case 'skills':
          // LinkedIn top skills usually appear one per line or comma-separated
          skillsLines.push(line);
          break;
        case 'experience':
          experienceText.push(line);
          break;
        case 'education':
          educationText.push(line);
          break;
        case 'certifications':
          certText.push(line);
          break;
        case 'awards':
          awardsText.push(line);
          break;
        default:
          break;
      }
    }

    profileData.about = summaryLines.join(' ').trim();

    // Parse skills
    const extractedSkills = new Set();
    skillsLines.forEach((sl) => {
      // Could be comma separated or single
      sl.split(/[,•|]/).forEach((s) => {
        const clean = s.trim();
        if (clean.length > 1 && clean.length < 40 && !clean.toLowerCase().includes('top skills')) {
          extractedSkills.add(clean);
        }
      });
    });
    profileData.skills = Array.from(extractedSkills);

    // Parse Experience (Group roughly by chunks)
    profileData.experience = this._parseExperienceBlocks(experienceText);

    // Parse Education
    profileData.education = this._parseEducationBlocks(educationText);

    // Parse Certifications
    profileData.certifications = certText.map((c) => ({
      name: c,
      issuer: '',
      year: ''
    }));

    // Parse Achievements/Awards
    profileData.achievements = awardsText.filter((a) => a.length > 3);

    return profileData;
  }

  _parseExperienceBlocks(lines) {
    const experiences = [];
    if (!lines || lines.length === 0) return experiences;

    let currentExp = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // A common pattern in LinkedIn PDF: Role Title, then Company, then Duration
      // Duration often has patterns like "January 2023 - Present" or "2022 - 2023 (1 year)"
      const isDatePattern = /(?:present|\b20\d\d\b|\b19\d\d\b|months?|years?)/i.test(line);

      if (!currentExp) {
        currentExp = {
          title: line,
          company: '',
          duration: '',
          description: '',
          isCurrent: false
        };
      } else if (!currentExp.company) {
        currentExp.company = line;
      } else if (!currentExp.duration && isDatePattern) {
        currentExp.duration = line;
        currentExp.isCurrent = /present/i.test(line);
      } else {
        // Collect description
        if (
          i + 2 < lines.length &&
          /(?:present|\b20\d\d\b)/i.test(lines[i + 2]) &&
          lines[i].length < 50
        ) {
          // Likely next experience block starting
          experiences.push(currentExp);
          currentExp = {
            title: line,
            company: '',
            duration: '',
            description: '',
            isCurrent: false
          };
        } else {
          currentExp.description = currentExp.description
            ? `${currentExp.description} ${line}`
            : line;
        }
      }
    }
    if (currentExp && currentExp.title) {
      experiences.push(currentExp);
    }
    return experiences;
  }

  _parseEducationBlocks(lines) {
    const educations = [];
    if (!lines || lines.length === 0) return educations;

    let currentEdu = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!currentEdu) {
        currentEdu = { school: line, degree: '', fieldOfStudy: '', year: '' };
      } else if (!currentEdu.degree) {
        currentEdu.degree = line;
      } else if (!currentEdu.year && /\b20\d\d\b|\b19\d\d\b/.test(line)) {
        currentEdu.year = line;
        educations.push(currentEdu);
        currentEdu = null;
      } else {
        currentEdu.fieldOfStudy = line;
      }
    }
    if (currentEdu && currentEdu.school) {
      educations.push(currentEdu);
    }
    return educations;
  }
}

module.exports = new LinkedInPdfParser();
