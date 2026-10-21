import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { profileAPI, resumeAPI, readinessAPI, jobAPI, applicationAPI, linkedinAPI, achievementAPI } from '../services/api';
import Alert from '../components/Alert';


const Dashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState('');
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [savingJobId, setSavingJobId] = useState(null);
  const [confirmApplyJob, setConfirmApplyJob] = useState(null);
  const [applyNotes, setApplyNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [latestReview, setLatestReview] = useState(null);
  const [latestLinkedIn, setLatestLinkedIn] = useState(null);
  const [latestAchievement, setLatestAchievement] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [profileRes, resumeRes, readinessRes, jobsRes, linkedinRes, achievementRes] = await Promise.allSettled([
        profileAPI.get(),
        resumeAPI.get(),
        readinessAPI.get(),
        jobAPI.getRecommended(),
        linkedinAPI.getLatest(),
        achievementAPI.getLatest()
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.data.data?.profile) {
        setProfile(profileRes.value.data.data.profile);
      }
      if (readinessRes.status === 'fulfilled' && readinessRes.value.data.data?.assessment) {
        setReadiness(readinessRes.value.data.data.assessment);
      }
      if (linkedinRes.status === 'fulfilled' && linkedinRes.value.data.data?.review) {
        setLatestLinkedIn(linkedinRes.value.data.data.review);
      }
      if (achievementRes.status === 'fulfilled' && achievementRes.value.data.data?.assessment) {
        setLatestAchievement(achievementRes.value.data.data.assessment);
      }

      if (jobsRes.status === 'fulfilled') {
        const jobsData = jobsRes.value.data?.data;
        if (jobsData?.profileIncomplete) {
          setProfileIncomplete(true);
          setRecommendedJobs([]);
        } else {
          setProfileIncomplete(false);
          const list = jobsData?.jobs || [];
          setRecommendedJobs(list);
          const savedSet = new Set();
          list.forEach((j) => {
            if (j.isSaved) savedSet.add(j.jobId || j._id);
          });
          setSavedJobIds(savedSet);
        }
      } else {
        setJobsError('Failed to load recommended opportunities.');
      }
      if (resumeRes.status === 'fulfilled' && resumeRes.value.data.data.resumes) {
        const fetchedResumes = resumeRes.value.data.data.resumes;
        setResumes(fetchedResumes);
        if (fetchedResumes.length > 0) {
          try {
            const detailRes = await resumeAPI.getById(fetchedResumes[0]._id);
            setLatestReview(detailRes.data.data.latestReview);
          } catch (reviewErr) {
            console.warn('[Review Fetch Note]', reviewErr);
          }
        }
      }
    } catch (err) {
      console.error('[Dashboard Error]', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendedOnly = async () => {
    setJobsLoading(true);
    setJobsError('');
    try {
      const res = await jobAPI.getRecommended();
      const data = res.data?.data;
      if (data?.profileIncomplete) {
        setProfileIncomplete(true);
        setRecommendedJobs([]);
      } else {
        setProfileIncomplete(false);
        const list = data?.jobs || [];
        setRecommendedJobs(list);
        const savedSet = new Set();
        list.forEach((j) => {
          if (j.isSaved) savedSet.add(j.jobId || j._id);
        });
        setSavedJobIds(savedSet);
      }
    } catch (err) {
      setJobsError(err.response?.data?.message || 'Could not refresh recommendations.');
    } finally {
      setJobsLoading(false);
    }
  };

  const handleSaveRecommendedJob = async (job) => {
    const id = job.jobId || job._id;
    setSavingJobId(id);
    try {
      await applicationAPI.create({
        jobId: id,
        jobData: job,
        status: 'Saved'
      });
      setSavedJobIds((prev) => new Set([...prev, id]));
    } catch (err) {
      console.error('[Save Recommended Error]', err);
    } finally {
      setSavingJobId(null);
    }
  };

  const handleOpenExternalApply = (job) => {
    const destination = job.applicationUrl || job.applyUrl;
    if (destination) {
      window.open(destination, '_blank', 'noopener,noreferrer');
    }
    setConfirmApplyJob(job);
  };

  const handleConfirmApplied = async () => {
    if (!confirmApplyJob) return;
    const id = confirmApplyJob.jobId || confirmApplyJob._id;
    try {
      await applicationAPI.create({
        jobId: id,
        jobData: confirmApplyJob,
        status: 'Applied',
        notes: applyNotes
      });
      // Remove the newly applied job immediately from state
      setRecommendedJobs((prev) => prev.filter((j) => (j.jobId || j._id) !== id));
      setConfirmApplyJob(null);
      setApplyNotes('');
      // Reload recommendations to get fresh unapplied matches
      loadRecommendedOnly();
    } catch (err) {
      console.error('[Confirm Applied Error]', err);
    }
  };

  // Calculate real profile completion percentage based on actual fields
  const calculateCompletion = () => {
    if (!profile) return 0;
    const checks = [
      Boolean(profile.targetRole),
      Boolean(profile.location),
      Boolean(profile.skills && profile.skills.length > 0),
      Boolean(profile.education),
      Boolean(profile.projects && profile.projects.length > 0),
      Boolean(profile.github),
      Boolean(profile.linkedin)
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadError('');
      setUploadMsg('');
    }
  };

  const handleResumeUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      return setUploadError('Please choose a file to upload');
    }

    setUploading(true);
    setUploadError('');
    setUploadMsg('');

    const formData = new FormData();
    formData.append('resume', selectedFile);

    try {
      const res = await resumeAPI.upload(formData);
      setUploadMsg(`Successfully uploaded "${res.data.data.resume.originalFilename}". Document validated.`);
      setSelectedFile(null);
      // Reset file input element
      const fileInput = document.getElementById('dashboard-file-upload');
      if (fileInput) fileInput.value = '';
      // Refresh uploaded resumes list
      const updatedResumes = await resumeAPI.get();
      setResumes(updatedResumes.data.data.resumes || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'File upload failed. Please verify format and size.';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const completionScore = calculateCompletion();
  const latestResume = resumes.length > 0 ? resumes[0] : null;

  return (
    <div>
      {/* Welcome & Completion Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          Welcome, {user?.name || 'Student'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Role: <strong style={{ textTransform: 'capitalize' }}>{user?.role || 'student'}</strong> | Placement Readiness Copilot Workspace
        </p>
      </div>

      {/* Production Readiness Score Banner (Live Scoring Engine) */}
      <div className="readiness-banner">
        <div>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85, fontWeight: 700 }}>
            Readiness Metric &bull; Placement Readiness Engine
          </span>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.25rem 0 0.5rem' }}>
            {readiness?.scoreStatus === 'provisional' ? 'Provisional Readiness Score' : 'Placement Readiness Score'}
          </h2>
          <p style={{ maxWidth: '540px', fontSize: '0.88rem', opacity: 0.9, lineHeight: 1.5 }}>
            {readiness?.score !== null
              ? `Derived from ${readiness?.coveragePercent || 0}% assessment coverage across your real resume, GitHub, and portfolio project audits.`
              : 'Complete a resume or project review to calculate your placement readiness score from real assessment data.'}
          </p>

          {readiness?.recommendations?.[0] && (
            <div style={{ marginTop: '0.65rem', padding: '0.4rem 0.75rem', background: 'rgba(255,255,255,0.12)', borderRadius: 'var(--radius-sm)', maxWidth: '540px', fontSize: '0.82rem' }}>
              <strong>Top Priority Action: </strong> {readiness.recommendations[0].title}
            </div>
          )}

          <div style={{ marginTop: '0.85rem' }}>
            <Link to="/readiness" className="btn btn-secondary btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}>
              Open Full Placement Readiness Dashboard &rarr;
            </Link>
          </div>
        </div>
        <div className="readiness-score-box">
          <div className="readiness-score-value">
            {readiness?.score !== null && readiness?.score !== undefined ? `${readiness.score} / 100` : '—'}
          </div>
          <div className="readiness-score-label">
            {readiness?.score !== null && readiness?.score !== undefined
              ? readiness.readinessLevel
              : 'Complete an assessment to calculate'}
          </div>
        </div>
      </div>

      {/* Profile & Artifact Statistics Grid */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div>
            <div className="stat-label">Profile Completion</div>
            <div className="stat-value">{completionScore}%</div>
          </div>
          <div className="stat-footer">
            <div style={{ background: '#e2e8f0', borderRadius: '4px', height: '6px', overflow: 'hidden', marginTop: '0.4rem' }}>
              <div
                style={{
                  background: completionScore === 100 ? 'var(--success)' : 'var(--primary)',
                  width: `${completionScore}%`,
                  height: '100%',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <Link to="/profile">Edit Profile &rarr;</Link>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Target Role</div>
            <div className="stat-value" style={{ fontSize: '1.15rem' }}>
              {profile?.targetRole || 'Not specified'}
            </div>
          </div>
          <div className="stat-footer">
            Location: {profile?.location || 'Not specified'}
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Technical Skills</div>
            <div className="stat-value">{profile?.skills?.length || 0} Listed</div>
          </div>
          <div className="stat-footer">
            {profile?.skills && profile.skills.length > 0 ? (
              <span className="tag">{profile.skills.slice(0, 3).join(', ')}{profile.skills.length > 3 ? '...' : ''}</span>
            ) : (
              <span>Add skills in your profile</span>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Resume Benchmark</div>
            <div className="stat-value">
              {latestReview ? `${latestReview.score}/100` : latestResume ? 'Analyzed' : '0 Added'}
            </div>
          </div>
          <div className="stat-footer">
            <Link to="/resume-review">Open Resume Intelligence &rarr;</Link>
          </div>
        </div>
      </div>

      {/* Resume Document Upload Module */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Resume Document & Analysis</h2>
            <p className="card-subtitle">
              Securely stored via MongoDB GridFS. Extracted via PyMuPDF/python-docx with deterministic scoring.
            </p>
          </div>
          <div>
            {latestResume ? (
              <span className="status-pill success">&#10003; {latestResume.status === 'processed' ? 'Benchmarked' : 'Uploaded'}</span>
            ) : (
              <span className="status-pill neutral">Not uploaded</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {latestResume ? (
            <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <strong>{latestResume.originalFilename}</strong>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Size: {(latestResume.fileSize / 1024).toFixed(1)} KB &bull; Uploaded on {new Date(latestResume.createdAt).toLocaleDateString()} &bull; {latestResume.pageCount || 1} Page(s)
                </div>
              </div>
              <Link to="/resume-review" className="btn btn-primary btn-sm">
                View Full Benchmark Report &rarr;
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                No resume document uploaded yet. Upload your CV to calculate your placement readiness score.
              </p>
              <Link to="/resume-review" className="btn btn-primary btn-sm">
                Upload in Resume Intelligence &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recommended Opportunities */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 className="card-title">🎯 Recommended Opportunities</h2>
            <p className="card-subtitle">
              Ranked with our deterministic matching engine against your verified skills, target role, and career preferences.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={loadRecommendedOnly}
              className="btn btn-secondary btn-sm"
              disabled={jobsLoading}
              style={{ fontSize: '0.8rem' }}
            >
              {jobsLoading ? 'Refreshing...' : '↻ Refresh'}
            </button>
            <Link to="/jobs" className="btn btn-secondary btn-sm" style={{ fontSize: '0.8rem' }}>
              Jobs Portal &rarr;
            </Link>
          </div>
        </div>

        {jobsLoading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <div className="spinner" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent', margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Evaluating real opportunities against your profile skills...
            </p>
          </div>
        ) : profileIncomplete ? (
          <div style={{ padding: '1.75rem', textAlign: 'center', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📝</div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.35rem' }}>
              Complete Your Profile to See Tailored Jobs
            </h4>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 1.25rem', fontSize: '0.88rem', lineHeight: 1.5 }}>
              Your profile skills and target role are incomplete. Add your verified technical skills to activate personalized job recommendations.
            </p>
            <Link to="/profile" className="btn btn-primary btn-sm">
              Complete Profile Skills &rarr;
            </Link>
          </div>
        ) : jobsError ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--danger-text)' }}>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem' }}>{jobsError}</p>
            <button onClick={loadRecommendedOnly} className="btn btn-secondary btn-sm">
              Retry
            </button>
          </div>
        ) : recommendedJobs.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem', marginTop: '0.75rem' }}>
            {recommendedJobs.map((job) => {
              const jobId = job.jobId || job._id;
              const isSaved = savedJobIds.has(jobId);
              const matchScore = job.matchScore !== undefined ? job.matchScore : (job.match?.matchScore || 0);

              const getBadgeColor = (score) => {
                if (score >= 80) return { bg: 'rgba(16, 185, 129, 0.15)', color: '#059669' };
                if (score >= 60) return { bg: 'rgba(79, 70, 229, 0.15)', color: '#4338ca' };
                if (score >= 40) return { bg: 'rgba(245, 158, 11, 0.15)', color: '#b45309' };
                return { bg: 'rgba(148, 163, 184, 0.15)', color: '#64748b' };
              };
              const badgeStyle = getBadgeColor(matchScore);

              return (
                <div
                  key={jobId}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: 'var(--bg-subtle)'
                  }}
                >
                  <div>
                    {/* Header: Title and Match Score */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {job.title}
                      </h4>
                      <span
                        className="status-pill"
                        style={{
                          background: badgeStyle.bg,
                          color: badgeStyle.color,
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {matchScore}% Match
                      </span>
                    </div>

                    {/* Company, Workplace, Location */}
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.65rem' }}>
                      <strong>{job.company}</strong> &bull; {job.location || 'Remote'}
                      <span style={{ marginLeft: '0.35rem', textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                        ({job.workplaceType || 'remote'}{job.employmentType ? ` &bull; ${job.employmentType}` : ''})
                      </span>
                    </div>

                    {/* Matching Explanation */}
                    {job.matchingReasons && job.matchingReasons.length > 0 && (
                      <div style={{ margin: '0.5rem 0', display: 'grid', gap: '0.2rem' }}>
                        {job.matchingReasons.slice(0, 2).map((r, i) => (
                          <div key={i} style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ color: 'var(--success)', fontWeight: 800 }}>&#10003;</span>
                            {r}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Matched & Missing Skills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.65rem' }}>
                      {job.matchedSkills && job.matchedSkills.slice(0, 3).map((s, idx) => (
                        <span
                          key={`m-${idx}`}
                          style={{
                            fontSize: '0.7rem',
                            padding: '0.15rem 0.4rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--success-bg)',
                            color: 'var(--success-text)',
                            fontWeight: 600
                          }}
                        >
                          ✓ {s}
                        </span>
                      ))}
                      {job.missingSkills && job.missingSkills.slice(0, 2).map((s, idx) => (
                        <span
                          key={`ms-${idx}`}
                          style={{
                            fontSize: '0.7rem',
                            padding: '0.15rem 0.4rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(0, 0, 0, 0.05)',
                            color: 'var(--text-muted)'
                          }}
                        >
                          + {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                    <button
                      onClick={() => handleSaveRecommendedJob(job)}
                      className="btn btn-secondary btn-sm"
                      disabled={isSaved || savingJobId === jobId}
                      style={{ fontSize: '0.78rem' }}
                    >
                      {isSaved ? 'Saved ✓' : savingJobId === jobId ? 'Saving...' : 'Save'}
                    </button>

                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <Link
                        to={`/jobs/${jobId}`}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
                      >
                        Details
                      </Link>
                      {(job.applicationUrl || job.applyUrl) && (
                        <button
                          onClick={() => handleOpenExternalApply(job)}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem', fontWeight: 600 }}
                        >
                          Apply ↗
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '1.75rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p style={{ margin: '0 0 1rem', fontSize: '0.9rem' }}>
              No new matching opportunities found right now. Try broadening your search or updating your skills.
            </p>
            <Link to="/jobs" className="btn btn-primary btn-sm">
              Explore Jobs & Internships
            </Link>
          </div>
        )}
      </div>

      {/* Confirmation Modal when student applies to a recommended job */}
      {confirmApplyJob && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 1000
          }}
          onClick={() => setConfirmApplyJob(null)}
        >
          <div
            className="card"
            style={{ maxWidth: '520px', width: '100%', padding: '2rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Confirm Application Submission
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
              You were redirected to apply for <strong>{confirmApplyJob.title}</strong> at <strong>{confirmApplyJob.company}</strong>.
              Did you complete and submit your application?
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Add Tracking Notes (Optional)
              </label>
              <textarea
                className="input"
                rows="2"
                placeholder="e.g. Applied via employer portal with resume v2..."
                value={applyNotes}
                onChange={(e) => setApplyNotes(e.target.value)}
                style={{ width: '100%', padding: '0.5rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setConfirmApplyJob(null)}
                className="btn btn-secondary btn-sm"
              >
                Not Yet / Just Browsing
              </button>
              <button
                onClick={handleConfirmApplied}
                className="btn btn-primary btn-sm"
                style={{ fontWeight: 700 }}
              >
                Yes, Mark as Applied ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real Feature Statuses */}
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '2rem 0 1rem' }}>
        Module Readiness Status
      </h3>
      <div className="feature-cards-grid">
        <div className="feature-status-card" style={{ borderLeft: '3px solid var(--success)' }}>
          <div className="feature-status-header">
            <span className="feature-status-title">Resume Intelligence</span>
            <span className="status-pill success">
              Active & Live
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            PyMuPDF parsing, 9 deterministic checks, ATS validation, and AI actionable fixes are fully live.
          </p>
          <div style={{ marginTop: '0.5rem' }}>
            <Link to="/resume-review" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
              Launch Resume Intelligence &rarr;
            </Link>
          </div>
        </div>

        <div className="feature-status-card" style={{ borderLeft: '3px solid var(--success)' }}>
          <div className="feature-status-header">
            <span className="feature-status-title">GitHub Profile Intelligence</span>
            <span className="status-pill success">
              Active & Live
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Real-time GitHub REST API integration, README verification, activity distribution, and portfolio auditing.
          </p>
          <div style={{ marginTop: '0.5rem' }}>
            <Link to="/github-review" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
              Launch GitHub Intelligence &rarr;
            </Link>
          </div>
        </div>

        <div className="feature-status-card" style={{ borderLeft: '3px solid var(--success)' }}>
          <div className="feature-status-header">
            <span className="feature-status-title">Projects & Live Verification</span>
            <span className="status-pill success">
              Active & Live
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Bounded code inspection, secret scanning, Playwright live website rendering, and claim verification.
          </p>
          <div style={{ marginTop: '0.5rem' }}>
            <Link to="/projects" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
              Launch Project Intelligence &rarr;
            </Link>
          </div>
        </div>

        <div className="feature-status-card" style={{ borderLeft: '3px solid var(--success)' }}>
          <div className="feature-status-header">
            <span className="feature-status-title">AI Mock Interview</span>
            <span className="status-pill success">Active & Live</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Personalized 15/20-minute adaptive technical and project-focused interviews with 5-dimension rubric evaluation.
          </p>
          <div style={{ marginTop: '0.5rem' }}>
            <Link to="/interview" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
              Start Mock Interview &rarr;
            </Link>
          </div>
        </div>

        <div className="feature-status-card" style={{ borderLeft: '3px solid var(--success)' }}>
          <div className="feature-status-header">
            <span className="feature-status-title">Jobs & Internships</span>
            <span className="status-pill success">Active & Live</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Explainable 5-factor matching for Greenhouse, Lever, and MSOT drives with application status tracking.
          </p>
          <div style={{ marginTop: '0.5rem' }}>
            <Link to="/jobs" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
              Explore Jobs & Tracker &rarr;
            </Link>
          </div>
        </div>

        {/* LinkedIn Profile Review Card */}
        <div
          className="feature-status-card"
          style={{
            borderLeft: latestLinkedIn
              ? '3px solid var(--success)'
              : '3px solid var(--warning)'
          }}
        >
          <div className="feature-status-header">
            <span className="feature-status-title">LinkedIn Profile Review</span>
            <span
              className={`status-pill ${
                latestLinkedIn ? 'success' : 'warning'
              }`}
            >
              {latestLinkedIn
                ? `Score: ${latestLinkedIn.overallScore}/100`
                : 'Not Assessed'}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {latestLinkedIn
              ? `Assessed ${new Date(
                  latestLinkedIn.reviewedAt || latestLinkedIn.createdAt
                ).toLocaleDateString()} via ${latestLinkedIn.inputMethod.toUpperCase()} with 8-rubric breakdown.`
              : 'Analyze your LinkedIn profile with our 100-point rubric, ATS keyword suggestions, and headline optimizer.'}
          </p>
          <div style={{ marginTop: '0.5rem' }}>
            <Link
              to="/linkedin-review"
              style={{ fontSize: '0.82rem', fontWeight: 600 }}
            >
              {latestLinkedIn
                ? 'Review / Analyze Again \u2192'
                : 'Analyze My LinkedIn Profile \u2192'}
            </Link>
          </div>
        </div>

        {/* Co-Curricular Achievement Assessment Card */}
        <div
          className="feature-status-card"
          style={{
            borderLeft: latestAchievement
              ? '3px solid var(--success)'
              : '3px solid var(--warning)'
          }}
        >
          <div className="feature-status-header">
            <span className="feature-status-title">
              Co-Curricular Achievement Assessment
            </span>
            <span
              className={`status-pill ${
                latestAchievement ? 'success' : 'warning'
              }`}
            >
              {latestAchievement
                ? `Score: ${latestAchievement.overallScore}/100`
                : 'Not Assessed'}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {latestAchievement
              ? `${latestAchievement.achievements?.length || 0} activity record(s) assessed across 6 dimensions with 30/60-day action plans.`
              : 'Assess your hackathons, club leadership, open source, and projects using a 6-dimension weighted rubric.'}
          </p>
          <div style={{ marginTop: '0.5rem' }}>
            <Link
              to="/achievements-assessment"
              style={{ fontSize: '0.82rem', fontWeight: 600 }}
            >
              {latestAchievement
                ? 'Continue / Retake Assessment \u2192'
                : 'Start Co-Curricular Assessment \u2192'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};


export default Dashboard;
