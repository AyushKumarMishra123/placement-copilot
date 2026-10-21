const Profile = require('../models/Profile');
const ProjectAnalysis = require('../models/ProjectAnalysis');
const githubRepositoryService = require('../services/github/githubRepositoryService');
const githubAnalysisService = require('../services/github/githubAnalysisService');
const liveCheckClient = require('../services/liveCheckClient');
const { getStorageProvider } = require('../services/storage');
const { getAIProvider } = require('../services/ai');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * List all projects from authenticated student's profile
 * GET /api/projects
 */
const getProjects = async (req, res, next) => {
  try {
    const profile = await Profile.findOne({ userId: req.user.id });
    const projects = profile?.projects || [];
    return successResponse(res, { projects });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a new project to student's profile
 * POST /api/projects
 */
const addProject = async (req, res, next) => {
  try {
    const { name, description, techStack, githubUrl, liveUrl } = req.body;

    if (!name || !name.trim()) {
      return errorResponse(res, 'Project name is required.', 'MISSING_FIELD', 400);
    }

    const newProject = {
      name: name.trim(),
      description: (description || '').trim(),
      techStack: Array.isArray(techStack) ? techStack : (typeof techStack === 'string' ? techStack.split(',').map((s) => s.trim()).filter(Boolean) : []),
      githubUrl: (githubUrl || '').trim(),
      liveUrl: (liveUrl || '').trim()
    };

    const profile = await Profile.findOneAndUpdate(
      { userId: req.user.id },
      { $push: { projects: newProject } },
      { new: true, upsert: true }
    );

    const createdProject = profile.projects[profile.projects.length - 1];
    return successResponse(res, { project: createdProject }, 'Project added successfully.', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update project subdocument
 * PUT /api/projects/:projectId
 */
const updateProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, description, techStack, githubUrl, liveUrl } = req.body;

    const profile = await Profile.findOne({ userId: req.user.id });
    if (!profile) {
      return errorResponse(res, 'Profile not found.', 'NOT_FOUND', 404);
    }

    const project = profile.projects.id(projectId);
    if (!project) {
      return errorResponse(res, 'Project not found.', 'NOT_FOUND', 404);
    }

    if (name !== undefined) project.name = name.trim();
    if (description !== undefined) project.description = description.trim();
    if (techStack !== undefined) {
      project.techStack = Array.isArray(techStack) ? techStack : techStack.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (githubUrl !== undefined) project.githubUrl = githubUrl.trim();
    if (liveUrl !== undefined) project.liveUrl = liveUrl.trim();

    await profile.save();
    return successResponse(res, { project }, 'Project updated successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete project and cascade-delete analyses and screenshots
 * DELETE /api/projects/:projectId
 */
const deleteProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const profile = await Profile.findOne({ userId: req.user.id });
    if (!profile) {
      return errorResponse(res, 'Profile not found.', 'NOT_FOUND', 404);
    }

    const project = profile.projects.id(projectId);
    if (!project) {
      return errorResponse(res, 'Project not found.', 'NOT_FOUND', 404);
    }

    // 1. Remove project subdocument
    profile.projects.pull(projectId);
    await profile.save();

    // 2. Cascade delete analyses and stored screenshots
    const analyses = await ProjectAnalysis.find({ projectId, userId: req.user.id });
    const storage = getStorageProvider();

    for (const a of analyses) {
      if (a.liveCheck?.desktopScreenshotId) {
        try {
          await storage.deleteFile(a.liveCheck.desktopScreenshotId, req.user.id);
        } catch (_) {}
      }
      if (a.liveCheck?.mobileScreenshotId) {
        try {
          await storage.deleteFile(a.liveCheck.mobileScreenshotId, req.user.id);
        } catch (_) {}
      }
    }

    await ProjectAnalysis.deleteMany({ projectId, userId: req.user.id });

    return successResponse(res, { deleted: true }, 'Project and associated analyses deleted.');
  } catch (error) {
    next(error);
  }
};

/**
 * Run comprehensive repository & project source-code analysis
 * POST /api/projects/:projectId/analyze
 */
const analyzeProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // 1. Fetch project from authenticated student's profile
    const profile = await Profile.findOne({ userId: req.user.id });
    if (!profile) {
      return errorResponse(res, 'Profile not found.', 'NOT_FOUND', 404);
    }

    const project = profile.projects.id(projectId);
    if (!project) {
      return errorResponse(res, 'Project not found.', 'NOT_FOUND', 404);
    }

    if (!project.githubUrl) {
      return errorResponse(
        res,
        'Cannot analyze repository: No GitHub repository URL configured on this project.',
        'MISSING_GITHUB_URL',
        400
      );
    }

    // 2. Fetch repository snapshot from GitHub
    const repoSnapshot = await githubRepositoryService.fetchRepositorySnapshot(project.githubUrl);

    // 3. Analyze README & cross-reference scripts
    const readmeAnalysis = githubAnalysisService.analyzeReadme(repoSnapshot.readmeText, repoSnapshot.packageJson);

    // 4. Scan for potential secrets (Masked!)
    const secretFindings = githubAnalysisService.scanForPotentialSecrets(repoSnapshot.sourceFiles, repoSnapshot.tree);

    // 5. Inspect code quality & tests
    const codeAnalysis = githubAnalysisService.inspectCodeQuality(
      repoSnapshot.sourceFiles,
      repoSnapshot.tree,
      repoSnapshot.testFiles
    );

    // 6. Check live website if liveUrl provided
    let liveCheck = {
      attempted: false,
      url: project.liveUrl || '',
      reachable: false
    };

    if (project.liveUrl && project.liveUrl.trim()) {
      liveCheck = await liveCheckClient.checkLiveLink(project.liveUrl.trim(), req.user.id);
    }

    // 7. Verify project claims against live website
    const claimVerification = githubAnalysisService.verifyProjectClaims({
      projectName: project.name,
      projectDescription: project.description,
      readmeText: repoSnapshot.readmeText,
      liveCheck
    });
    liveCheck.claimVerification = claimVerification;

    // 8. Calculate deterministic scores
    const scores = githubAnalysisService.calculateRepoScores(readmeAnalysis, codeAnalysis, secretFindings, liveCheck);

    // 9. Qualitative AI feedback
    let aiSynthesis = {
      documentationClarity: 'README covers key installation and usage guidelines.',
      codeReadabilityFeedback: 'Source code maintains modular structure.',
      recommendations: []
    };

    try {
      const aiProvider = getAIProvider();
      if (aiProvider.generateProjectSynthesis) {
        aiSynthesis = await aiProvider.generateProjectSynthesis({
          projectName: project.name,
          techStack: project.techStack,
          readmeSummary: repoSnapshot.readmeText.slice(0, 1500),
          codeFindings: codeAnalysis.findings
        });
      } else {
        const recs = [];
        if (!codeAnalysis.hasTests) recs.push('Implement automated unit tests to demonstrate verification standards.');
        if (!readmeAnalysis.hasEnvInstructions) recs.push('Document required environment variables in a .env.example file.');
        if (secretFindings.length > 0) recs.push('CRITICAL: Rotate exposed credentials and remove secrets from repository history.');
        aiSynthesis.recommendations = recs.length > 0 ? recs : ['Repository demonstrates clean documentation and modular architecture.'];
      }
    } catch (_) {
      // AI failure fallback
      aiSynthesis.recommendations = ['Continue maintaining clean documentation and automated test suites.'];
    }

    // 10. Determine iteration version
    const previousAnalysesCount = await ProjectAnalysis.countDocuments({
      projectId,
      userId: req.user.id
    });
    const version = previousAnalysesCount + 1;

    // 11. Persist ProjectAnalysis in MongoDB
    const analysis = await ProjectAnalysis.create({
      userId: req.user.id,
      projectId,
      projectName: project.name,
      projectDescription: project.description,
      techStack: project.techStack,
      repositoryUrl: repoSnapshot.repoUrl,
      commitSha: repoSnapshot.latestCommitSha,
      scores,
      READMEAnalysis: readmeAnalysis,
      codeAnalysis,
      secretFindings,
      liveCheck,
      aiSynthesis,
      version
    });

    return successResponse(res, { analysis }, 'Project analyzed successfully.', 201);
  } catch (error) {
    if (error.name === 'GitHubClientError') {
      return errorResponse(res, error.message, error.code, error.status);
    }
    next(error);
  }
};

/**
 * Get latest analysis for a project
 * GET /api/projects/:projectId/analysis
 */
const getProjectAnalysis = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const analysis = await ProjectAnalysis.findOne({
      projectId,
      userId: req.user.id
    }).sort({ createdAt: -1 });

    if (!analysis) {
      return errorResponse(res, 'No analysis generated for this project yet.', 'ANALYSIS_NOT_FOUND', 404);
    }

    return successResponse(res, { analysis });
  } catch (error) {
    next(error);
  }
};

/**
 * Get analysis history for a project
 * GET /api/projects/:projectId/analyses
 */
const getProjectAnalysesHistory = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const analyses = await ProjectAnalysis.find({
      projectId,
      userId: req.user.id
    }).sort({ createdAt: -1 });

    return successResponse(res, { analyses });
  } catch (error) {
    next(error);
  }
};

/**
 * Check live website explicitly
 * POST /api/projects/:projectId/check-live-link
 */
const checkProjectLiveLink = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const profile = await Profile.findOne({ userId: req.user.id });
    if (!profile) {
      return errorResponse(res, 'Profile not found.', 'NOT_FOUND', 404);
    }

    const project = profile.projects.id(projectId);
    if (!project) {
      return errorResponse(res, 'Project not found.', 'NOT_FOUND', 404);
    }

    const targetUrl = req.body.url || project.liveUrl;
    if (!targetUrl || !targetUrl.trim()) {
      return errorResponse(res, 'Live project URL is required.', 'MISSING_URL', 400);
    }

    // Run Playwright live check
    const liveCheckResult = await liveCheckClient.checkLiveLink(targetUrl.trim(), req.user.id);

    // Verify claim if analysis exists
    const latestAnalysis = await ProjectAnalysis.findOne({
      projectId,
      userId: req.user.id
    }).sort({ createdAt: -1 });

    if (latestAnalysis) {
      const claim = githubAnalysisService.verifyProjectClaims({
        projectName: project.name,
        projectDescription: project.description,
        readmeText: '',
        liveCheck: liveCheckResult
      });
      liveCheckResult.claimVerification = claim;
      latestAnalysis.liveCheck = liveCheckResult;
      await latestAnalysis.save();
    }

    return successResponse(res, { liveCheck: liveCheckResult }, 'Website check completed.');
  } catch (error) {
    next(error);
  }
};

/**
 * Stream captured screenshot from GridFS securely
 * GET /api/projects/:projectId/screenshots/:screenshotId
 */
const getProjectScreenshot = async (req, res, next) => {
  try {
    const { projectId, screenshotId } = req.params;

    // Verify ownership of the project
    const profile = await Profile.findOne({ userId: req.user.id });
    if (!profile || !profile.projects.id(projectId)) {
      return errorResponse(res, 'Access denied: Project not found or unauthorized.', 'UNAUTHORIZED', 403);
    }

    const storage = getStorageProvider();
    const stream = await storage.getFileStream(screenshotId, req.user.id);

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    stream.pipe(res);
  } catch (error) {
    if (error.statusCode === 403 || error.message?.includes('Access denied')) {
      return errorResponse(res, 'Access denied: You do not own this screenshot.', 'FORBIDDEN', 403);
    }
    return errorResponse(res, 'Screenshot not found.', 'NOT_FOUND', 404);
  }
};

module.exports = {
  getProjects,
  addProject,
  updateProject,
  deleteProject,
  analyzeProject,
  getProjectAnalysis,
  getProjectAnalysesHistory,
  checkProjectLiveLink,
  getProjectScreenshot
};
