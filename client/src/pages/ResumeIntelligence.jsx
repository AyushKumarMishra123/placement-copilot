import React, { useState, useEffect } from 'react';
import { resumeAPI } from '../services/api';
import Alert from '../components/Alert';

const CATEGORY_LABELS = {
  structure: 'Structure & Format',
  projects: 'Project Quality & Depth',
  measurableImpact: 'Measurable Impact & Verbs',
  skillsAts: 'Skills & ATS Readability',
  profilesLinks: 'Coding & Profile Links',
  achievements: 'Achievements & Honors'
};

const CATEGORY_MAX = {
  structure: 15,
  projects: 20,
  measurableImpact: 25,
  skillsAts: 20,
  profilesLinks: 10,
  achievements: 10
};

const ResumeIntelligence = () => {
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [currentResume, setCurrentResume] = useState(null);
  const [reviewsHistory, setReviewsHistory] = useState([]);
  const [activeReview, setActiveReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'fail' | 'pass'
  const [showAtsData, setShowAtsData] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      setLoading(true);
      const res = await resumeAPI.get();
      const list = res.data.data.resumes || [];
      setResumes(list);
      if (list.length > 0) {
        loadResumeDetails(list[0]._id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('[Fetch Resumes Error]', err);
      setStatusMessage({ type: 'danger', text: 'Failed to load uploaded resumes.' });
      setLoading(false);
    }
  };

  const loadResumeDetails = async (resumeId) => {
    try {
      setSelectedResumeId(resumeId);
      const [detailRes, historyRes] = await Promise.all([
        resumeAPI.getById(resumeId),
        resumeAPI.getReviewsHistory(resumeId)
      ]);

      const resumeData = detailRes.data.data.resume;
      const history = historyRes.data.data.reviews || [];
      const latest = detailRes.data.data.latestReview || (history.length > 0 ? history[0] : null);

      setCurrentResume(resumeData);
      setReviewsHistory(history);
      setActiveReview(latest);
    } catch (err) {
      console.error('[Resume Details Error]', err);
      setStatusMessage({ type: 'danger', text: 'Could not retrieve resume review details.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectResume = (e) => {
    const rId = e.target.value;
    if (rId) {
      loadResumeDetails(rId);
    }
  };

  const handleSelectVersion = (review) => {
    setActiveReview(review);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    const validExtensions = ['.pdf', '.docx', '.doc'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setStatusMessage({ type: 'danger', text: 'Invalid format. Only PDF and DOCX files are allowed.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({ type: 'danger', text: 'File size exceeds 5MB limit.' });
      return;
    }
    setSelectedUploadFile(file);
    setStatusMessage({ type: '', text: '' });
  };

  const handleUploadResume = async (e) => {
    if (e) e.preventDefault();
    if (!selectedUploadFile) return;

    setActionLoading(true);
    setStatusMessage({ type: 'info', text: 'Uploading document, parsing sections with PyMuPDF, and running 9 benchmark checks...' });

    const formData = new FormData();
    formData.append('resume', selectedUploadFile);

    try {
      const res = await resumeAPI.upload(formData);
      const newResume = res.data.data.resume;
      setStatusMessage({
        type: 'success',
        text: `"${newResume.originalFilename}" uploaded and analyzed! Score calculated.`
      });
      setSelectedUploadFile(null);
      // Reset input element
      const fileInput = document.getElementById('resume-intel-file-input');
      if (fileInput) fileInput.value = '';

      // Refresh resumes and select new one
      const listRes = await resumeAPI.get();
      const updatedList = listRes.data.data.resumes || [];
      setResumes(updatedList);
      if (newResume.id) {
        await loadResumeDetails(newResume.id);
      }
    } catch (err) {
      console.error('[Upload Error]', err);
      const msg = err.response?.data?.message || 'Upload and parsing failed. Please verify document formatting.';
      setStatusMessage({ type: 'danger', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReReview = async () => {
    if (!selectedResumeId) return;
    setActionLoading(true);
    setStatusMessage({ type: 'info', text: 'Re-analyzing resume against placement benchmarks...' });

    try {
      await resumeAPI.reReview(selectedResumeId);
      setStatusMessage({ type: 'success', text: 'Fresh review and score calculated successfully.' });
      await loadResumeDetails(selectedResumeId);
    } catch (err) {
      console.error('[Re-review Error]', err);
      setStatusMessage({
        type: 'danger',
        text: err.response?.data?.message || 'Re-analysis failed. Please check backend services.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteResume = async () => {
    if (!selectedResumeId) return;
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this resume, its stored document, and all associated review history?'
    );
    if (!confirmed) return;

    setActionLoading(true);
    setStatusMessage({ type: 'info', text: 'Deleting resume and associated records...' });
    try {
      await resumeAPI.delete(selectedResumeId);
      setStatusMessage({ type: 'success', text: 'Resume and review records deleted successfully.' });
      const listRes = await resumeAPI.get();
      const updatedList = listRes.data.data?.resumes || [];
      setResumes(updatedList);
      if (updatedList.length > 0) {
        await loadResumeDetails(updatedList[0]._id);
      } else {
        setSelectedResumeId(null);
        setCurrentResume(null);
        setActiveReview(null);
        setReviewsHistory([]);
      }
    } catch (err) {
      console.error('[Delete Resume Error]', err);
      setStatusMessage({
        type: 'danger',
        text: err.response?.data?.message || 'Failed to delete resume.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredChecks = (activeReview?.checks || []).filter((c) => {
    if (filterTab === 'fail') return c.status === 'fail' || c.status === 'warning';
    if (filterTab === 'pass') return c.status === 'pass';
    return true;
  });

  const failedCount = (activeReview?.checks || []).filter((c) => c.status === 'fail' || c.status === 'warning').length;
  const passedCount = (activeReview?.checks || []).filter((c) => c.status === 'pass').length;

  const getScoreBadgeColor = (score) => {
    if (score >= 85) return 'var(--success)';
    if (score >= 70) return 'var(--primary)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Resume Intelligence
            </h1>
            <span className="status-pill success" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
              Intelligence Active
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Deterministic placement benchmarks, PyMuPDF structure extraction, ATS audit, and AI actionable fixes.
          </p>
        </div>

        {/* Resume Selector & Actions */}
        {resumes.length > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={selectedResumeId || ''}
              onChange={handleSelectResume}
              className="form-control"
              style={{ width: 'auto', minWidth: '220px', padding: '0.45rem 0.85rem', fontSize: '0.88rem' }}
            >
              {resumes.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.originalFilename} ({new Date(r.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>

            <button
              onClick={handleReReview}
              disabled={actionLoading}
              className="btn btn-secondary btn-sm"
              title="Re-run benchmark evaluation"
            >
              {actionLoading ? <span className="spinner" /> : 'Re-Run Benchmark'}
            </button>

            <button
              onClick={handleDeleteResume}
              disabled={actionLoading}
              className="btn btn-outline btn-sm"
              style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
              title="Permanently delete this resume and its review history"
            >
              Delete Resume
            </button>
          </div>
        )}
      </div>

      {statusMessage.text && (
        <Alert
          variant={statusMessage.type}
          message={statusMessage.text}
          onClose={() => setStatusMessage({ type: '', text: '' })}
        />
      )}

      {/* Upload Dropzone Container */}
      <div
        className={`card ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        style={{
          border: dragActive ? '2px dashed var(--primary)' : '1px dashed var(--border-color)',
          background: dragActive ? 'var(--primary-light)' : 'var(--bg-surface)',
          padding: '1.5rem',
          textAlign: 'center',
          marginBottom: '2rem',
          transition: 'all var(--transition-normal)'
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ width: '48px', height: '48px', margin: '0 auto 0.75rem', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            {selectedUploadFile ? `Selected: ${selectedUploadFile.name}` : 'Upload Resume for Intelligent Review'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Drag and drop your PDF or DOCX file here, or click to browse. Evaluates strictly against campus placement benchmarks.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              id="resume-intel-file-input"
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => document.getElementById('resume-intel-file-input').click()}
            >
              Choose File
            </button>

            {selectedUploadFile && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleUploadResume}
                disabled={actionLoading}
              >
                {actionLoading ? <span className="spinner" /> : 'Run Full Review Pipeline'}
              </button>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Supported: PDF, DOCX (Max 5MB) &bull; Processed securely via MongoDB GridFS
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
          <p>Processing resume intelligence...</p>
        </div>
      ) : activeReview ? (
        <>
          {/* Version History Tabs if multiple iterations exist */}
          {reviewsHistory.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Review Iterations:
              </span>
              {reviewsHistory.map((rev) => (
                <button
                  key={rev._id}
                  onClick={() => handleSelectVersion(rev)}
                  className={`btn btn-sm ${activeReview._id === rev._id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}
                >
                  v{rev.version} &bull; Score: {rev.score}/100 {activeReview._id === rev._id ? '(Viewing)' : ''}
                </button>
              ))}
            </div>
          )}

          {/* Primary Score & Categorical Breakdown Banner */}
          <div
            className="card"
            style={{
              padding: '1.75rem',
              marginBottom: '2rem',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', alignItems: 'center' }}>
              {/* Score Dial & Overall Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div
                  style={{
                    width: '110px',
                    height: '110px',
                    borderRadius: '50%',
                    border: `7px solid ${getScoreBadgeColor(activeReview.score)}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-surface)',
                    boxShadow: 'var(--shadow-md)',
                    flexShrink: 0
                  }}
                >
                  <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                    {activeReview.score}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    out of 100
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700 }}>
                    Deterministic Benchmark
                  </span>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0.2rem 0 0.35rem' }}>
                    {activeReview.score >= 85
                      ? 'Placement Ready'
                      : activeReview.score >= 70
                      ? 'Competitive Candidate'
                      : activeReview.score >= 50
                      ? 'Actionable Fixes Required'
                      : 'Critical Revision Needed'}
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, maxWidth: '420px' }}>
                    {activeReview.summary || 'Score derived deterministically across all 9 standard campus placement checks.'}
                  </p>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    Document: <strong>{currentResume?.originalFilename}</strong> &bull; Length: <strong>{currentResume?.pageCount || 1} Page(s)</strong> &bull; Review: v{activeReview.version}
                  </div>
                </div>
              </div>

              {/* Categorical Breakdown Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Category Performance
                </span>
                {activeReview.categoryScores &&
                  Object.entries(activeReview.categoryScores).map(([catKey, catScore]) => {
                    const maxScore = CATEGORY_MAX[catKey] || 20;
                    const pct = Math.min(100, Math.round((catScore / maxScore) * 100));
                    return (
                      <div key={catKey}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.2rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {CATEGORY_LABELS[catKey] || catKey}
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {catScore} / {maxScore} pts
                          </span>
                        </div>
                        <div style={{ height: '6px', background: 'var(--bg-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)',
                              borderRadius: '4px',
                              transition: 'width 0.4s ease'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* AI Recruiter Synthesis Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            {/* Strengths */}
            <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>&#10003;</span> Verified Strengths
              </h3>
              <ul style={{ paddingLeft: '1.2rem', fontSize: '0.88rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {activeReview.strengths && activeReview.strengths.length > 0 ? (
                  activeReview.strengths.map((str, idx) => <li key={idx}>{str}</li>)
                ) : (
                  <li>No prominent strengths detected. Complete benchmark checks below.</li>
                )}
              </ul>
            </div>

            {/* Critical Gaps & Recommendations */}
            <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--danger-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>&#9888;</span> Key Gaps to Fix
              </h3>
              <ul style={{ paddingLeft: '1.2rem', fontSize: '0.88rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {activeReview.weaknesses && activeReview.weaknesses.length > 0 ? (
                  activeReview.weaknesses.map((w, idx) => <li key={idx}>{w}</li>)
                ) : (
                  <li>No critical gaps detected. Profile meets all placement standards.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Benchmark Checks Section */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div className="card-header" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 className="card-title" style={{ fontSize: '1.25rem' }}>
                  Benchmark Audit Checklist ({activeReview.checks?.length || 0} Checks)
                </h2>
                <p className="card-subtitle">
                  Every check is evaluated deterministically against placement criteria with concrete fixes.
                </p>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  className={`btn btn-sm ${filterTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFilterTab('all')}
                >
                  All ({activeReview.checks?.length || 0})
                </button>
                <button
                  className={`btn btn-sm ${filterTab === 'fail' ? 'btn-danger' : 'btn-secondary'}`}
                  onClick={() => setFilterTab('fail')}
                  style={{ color: filterTab === 'fail' ? '#fff' : 'var(--danger)' }}
                >
                  Issues ({failedCount})
                </button>
                <button
                  className={`btn btn-sm ${filterTab === 'pass' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFilterTab('pass')}
                  style={{ color: filterTab === 'pass' ? '#fff' : 'var(--success)' }}
                >
                  Passed ({passedCount})
                </button>
              </div>
            </div>

            {/* Check List Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredChecks.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No checks match the selected filter tab.
                </div>
              ) : (
                filteredChecks.map((check) => {
                  const isFail = check.status === 'fail';
                  const isWarning = check.status === 'warning';
                  const badgeClass = isFail ? 'danger' : isWarning ? 'warning' : 'success';
                  const badgeText = isFail ? 'FAIL' : isWarning ? 'WARNING' : 'PASS';

                  return (
                    <div
                      key={check.id}
                      style={{
                        padding: '1.25rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-subtle)',
                        border: `1px solid ${isFail ? 'var(--danger-border)' : isWarning ? 'var(--warning-border)' : 'var(--border-color)'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <span className={`status-pill ${badgeClass}`} style={{ fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                            {badgeText}
                          </span>
                          <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                            {check.name}
                          </strong>
                        </div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Score: {check.score} / {check.weight} pts &bull; <span style={{ textTransform: 'capitalize' }}>{check.category}</span>
                        </div>
                      </div>

                      {/* Evidence */}
                      {check.evidence && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-surface)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>Observed in Resume: </strong>
                          <code>{check.evidence}</code>
                        </div>
                      )}

                      {/* Problem / Explanation */}
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                        <strong>{isFail ? 'Problem: ' : isWarning ? 'Note: ' : 'Analysis: '}</strong>
                        {check.explanation}
                      </div>

                      {/* Actionable Suggested Fix */}
                      <div
                        style={{
                          background: isFail ? 'var(--danger-bg)' : isWarning ? 'var(--warning-bg)' : 'var(--success-bg)',
                          border: `1px solid ${isFail ? 'var(--danger-border)' : isWarning ? 'var(--warning-border)' : 'var(--success-border)'}`,
                          padding: '0.75rem 1rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.86rem',
                          color: isFail ? 'var(--danger-text)' : isWarning ? 'var(--warning-text)' : 'var(--success-text)',
                          lineHeight: 1.45
                        }}
                      >
                        <strong>Suggested Fix: </strong>
                        {check.suggestion}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Collapsible ATS Structured Data Inspector */}
          <div className="card">
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setShowAtsData(!showAtsData)}
            >
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  ATS Structured Data Inspector
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  View the exact structured data extracted by the Python document parsing service.
                </p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm">
                {showAtsData ? 'Hide Data' : 'View Extracted Data'}
              </button>
            </div>

            {showAtsData && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
                <pre
                  style={{
                    background: '#0f172a',
                    color: '#f8fafc',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.78rem',
                    overflowX: 'auto',
                    maxHeight: '400px'
                  }}
                >
                  {JSON.stringify(currentResume?.structuredData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            No Resume Uploaded Yet
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '450px', margin: '0 auto 1.5rem' }}>
            Upload your resume above in PDF or DOCX format to trigger automated PyMuPDF extraction, deterministic benchmark testing, and AI review.
          </p>
        </div>
      )}
    </div>
  );
};

export default ResumeIntelligence;
