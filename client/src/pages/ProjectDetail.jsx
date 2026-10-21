import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectAPI } from '../services/api';

const ProjectDetail = () => {
  const { projectId } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [runningLiveCheck, setRunningLiveCheck] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch latest analysis
      try {
        const res = await projectAPI.getAnalysis(projectId);
        setAnalysis(res.data.data?.analysis || null);
      } catch (err) {
        if (err.response?.status !== 404) {
          setError(err.response?.data?.message || 'Could not load project analysis.');
        }
      }

      // 2. Fetch history
      try {
        const historyRes = await projectAPI.getAnalysesHistory(projectId);
        setHistory(historyRes.data.data?.analyses || []);
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    setRunningAnalysis(true);
    setError(null);
    try {
      const res = await projectAPI.analyzeProject(projectId);
      const newAnalysis = res.data.data?.analysis;
      setAnalysis(newAnalysis);
      setHistory((prev) => [newAnalysis, ...prev.filter((h) => h._id !== newAnalysis._id)]);
    } catch (err) {
      setError(err.response?.data?.message || 'Repository analysis failed. Please verify GitHub repo is public.');
    } finally {
      setRunningAnalysis(false);
    }
  };

  const handleRunLiveCheck = async () => {
    setRunningLiveCheck(true);
    try {
      const res = await projectAPI.checkLiveLink(projectId);
      const updatedLiveCheck = res.data.data?.liveCheck;
      if (analysis) {
        setAnalysis({ ...analysis, liveCheck: updatedLiveCheck });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Live link verification failed.');
    } finally {
      setRunningLiveCheck(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading project intelligence report...</p>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Breadcrumb & Navigation */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
          ← Back to All Projects
        </Link>
        {history.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Historical Snapshot:</span>
            <select
              className="input"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}
              value={analysis?._id || ''}
              onChange={(e) => {
                const found = history.find((h) => h._id === e.target.value);
                if (found) setAnalysis(found);
              }}
            >
              {history.map((h, i) => (
                <option key={h._id} value={h._id}>
                  v{h.version || history.length - i} — {new Date(h.createdAt).toLocaleDateString()} (Score: {h.scores?.overallProjectScore})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <strong>Notice:</strong> {error}
        </div>
      )}

      {!analysis ? (
        <div className="card" style={{ padding: '3.5rem', textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600 }}>No Analysis Performed Yet</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0.5rem auto 1.5rem' }}>
            Run the automated source-code inspection to evaluate README quality, check for accidental secrets, analyze tests, and verify live browser rendering.
          </p>
          <button
            onClick={handleRunAnalysis}
            className="btn btn-primary"
            disabled={runningAnalysis}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {runningAnalysis ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px' }} />
                Inspecting Repository...
              </>
            ) : (
              'Run Initial Project Analysis'
            )}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '2rem' }}>
          {/* Top Overview & Scores Header */}
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Iteration v{analysis.version || 1} • {analysis.commitSha ? `SHA: ${analysis.commitSha.slice(0, 7)}` : 'Latest Head'}
                </span>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0.25rem 0', color: 'var(--text-primary)' }}>
                  {analysis.projectName}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', maxWidth: '650px' }}>
                  {analysis.projectDescription || <em>No description provided.</em>}
                </p>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                  {analysis.repositoryUrl && (
                    <a href={analysis.repositoryUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                      </svg>
                      {analysis.repositoryUrl}
                    </a>
                  )}
                  {analysis.liveCheck?.url && (
                    <a href={analysis.liveCheck.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--success)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                      {analysis.liveCheck.url}
                    </a>
                  )}
                </div>
              </div>

              {/* Score Badges */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div
                  style={{
                    textAlign: 'center',
                    background: 'var(--bg-subtle)',
                    padding: '1rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    minWidth: '140px'
                  }}
                >
                  <div style={{ fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Project Score
                  </div>
                  <div
                    style={{
                      fontSize: '2.5rem',
                      fontWeight: 800,
                      color: getScoreColor(analysis.scores?.overallProjectScore || 0),
                      lineHeight: 1.1
                    }}
                  >
                    {analysis.scores?.overallProjectScore || 0}
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/100</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    onClick={handleRunAnalysis}
                    className="btn btn-primary btn-sm"
                    disabled={runningAnalysis}
                  >
                    {runningAnalysis ? 'Re-analyzing...' : 'Re-run Analysis'}
                  </button>
                  {analysis.liveCheck?.url && (
                    <button
                      onClick={handleRunLiveCheck}
                      className="btn btn-secondary btn-sm"
                      disabled={runningLiveCheck}
                    >
                      {runningLiveCheck ? 'Checking...' : 'Re-verify Live Site'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Sub-Score Breakdown Tiles */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '1rem',
                marginTop: '1.75rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid var(--border-color)'
              }}
            >
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>README Quality</span>
                <strong style={{ fontSize: '1.25rem', color: getScoreColor(analysis.scores?.readmeQuality || 0) }}>
                  {analysis.scores?.readmeQuality || 0}/100
                </strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Repo Architecture</span>
                <strong style={{ fontSize: '1.25rem', color: getScoreColor(analysis.scores?.repositoryQuality || 0) }}>
                  {analysis.scores?.repositoryQuality || 0}/100
                </strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Code Quality</span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                  {analysis.scores?.codeQuality || 0}/25
                </strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Live Verification</span>
                <strong style={{ fontSize: '1.25rem', color: analysis.liveCheck?.reachable ? 'var(--success)' : 'var(--text-muted)' }}>
                  {analysis.liveCheck?.reachable ? `${analysis.scores?.liveWebsiteQuality || 15}/15` : '0/15'}
                </strong>
              </div>
            </div>
          </div>

          {/* Section: Potential Committed Secrets */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Potential Committed Secrets & Credential Safeguards
            </h3>

            {(analysis.secretFindings || []).length > 0 ? (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div className="alert alert-danger" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>
                      Critical: Potential Credentials Detected ({analysis.secretFindings.length})
                    </h4>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      Never commit API keys or database connection strings to public repositories. If these credentials are valid, revoke and rotate them immediately with your service provider. Deleting the commit in Git history is required to prevent bot harvesting.
                    </p>
                  </div>
                </div>

                {analysis.secretFindings.map((sec, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid var(--danger-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      background: 'var(--danger-bg)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--danger-text)' }}>{sec.category}</strong>
                      <span className="badge badge-danger">Critical</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.35rem', color: 'var(--text-secondary)' }}>
                      <strong>File:</strong> <code>{sec.filePath}</code>
                    </p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                      <strong>Masked Match:</strong> <code>{sec.maskedEvidence}</code>
                    </p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'var(--text-primary)' }}>
                      <strong>Action:</strong> {sec.suggestedFix}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--success-bg)',
                  border: '1px solid var(--success-border)',
                  color: 'var(--success-text)'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                  No potential credentials or unignored .env files detected in inspected repository files.
                </span>
              </div>
            )}
          </div>

          {/* Section: README & Documentation Quality */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                README & Setup Documentation Review
              </h3>
              <span
                className="badge"
                style={{
                  background: getScoreColor(analysis.READMEAnalysis?.qualityScore || 0),
                  color: '#fff',
                  fontWeight: 700
                }}
              >
                Score: {analysis.READMEAnalysis?.qualityScore || 0}/100
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {/* Passed checklist */}
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--success-text)', marginBottom: '0.75rem' }}>
                  ✓ Passed Checks
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.5rem' }}>
                  {(analysis.READMEAnalysis?.passed || []).length > 0 ? (
                    analysis.READMEAnalysis.passed.map((item, idx) => (
                      <li key={idx} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                        <span style={{ color: 'var(--success)' }}>●</span> {item}
                      </li>
                    ))
                  ) : (
                    <li style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No standard README sections detected.</li>
                  )}
                </ul>

                {/* Cross-referenced scripts */}
                {(analysis.READMEAnalysis?.scriptsCrossReferenced || []).length > 0 && (
                  <div style={{ marginTop: '1rem', background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Package Manifest Cross-Reference
                    </span>
                    <ul style={{ listStyle: 'none', padding: 0, marginTop: '0.35rem', display: 'grid', gap: '0.25rem' }}>
                      {analysis.READMEAnalysis.scriptsCrossReferenced.map((scr, idx) => (
                        <li key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {scr}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Documentation Issues */}
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--danger-text)', marginBottom: '0.75rem' }}>
                  ⚠ Documentation Gaps & Issues
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.5rem' }}>
                  {(analysis.READMEAnalysis?.issues || []).length > 0 ? (
                    analysis.READMEAnalysis.issues.map((item, idx) => (
                      <li key={idx} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'var(--text-primary)' }}>
                        <span style={{ color: 'var(--danger)' }}>■</span>
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <li style={{ fontSize: '0.85rem', color: 'var(--success-text)' }}>All documentation criteria met!</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Section: Live Website Verification (Playwright) */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Live Website & Browser Inspection (Playwright)
            </h3>

            {analysis.liveCheck?.attempted ? (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Status Bar */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    padding: '1rem',
                    background: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Reachability</span>
                    <strong style={{ color: analysis.liveCheck.reachable ? 'var(--success)' : 'var(--danger)' }}>
                      {analysis.liveCheck.reachable ? 'Navigation Succeeded' : 'Unreachable / Failed'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>HTTP Status</span>
                    <strong>{analysis.liveCheck.finalStatus || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Page Title</span>
                    <strong style={{ wordBreak: 'break-word' }}>{analysis.liveCheck.pageTitle || 'Untitled'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Claim Verification</span>
                    <span
                      className={`badge ${
                        analysis.claimVerification?.status === 'Verified'
                          ? 'badge-success'
                          : analysis.claimVerification?.status === 'Partially verified'
                          ? 'badge-warning'
                          : 'badge-danger'
                      }`}
                      style={{ marginTop: '0.25rem' }}
                    >
                      {analysis.claimVerification?.status || 'Unverified'}
                    </span>
                  </div>
                </div>

                {/* Claim Verification Details */}
                {analysis.claimVerification && (
                  <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                      Project Claim Semantic Evidence
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {analysis.claimVerification.explanation}
                    </p>
                    {analysis.claimVerification.evidence && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        <strong>Evidence:</strong> {analysis.claimVerification.evidence}
                      </p>
                    )}
                  </div>
                )}

                {/* Browser Screenshots */}
                {(analysis.liveCheck.screenshotDesktopStorageId || analysis.liveCheck.screenshotMobileStorageId) && (
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                      Captured Browser Render Evidence
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                      {analysis.liveCheck.screenshotDesktopStorageId && (
                        <div>
                          <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                            Desktop Viewport (1280 × 800)
                          </span>
                          <img
                            src={projectAPI.getScreenshotUrl(projectId, analysis.liveCheck.screenshotDesktopStorageId)}
                            alt="Desktop Rendering"
                            style={{ width: '100%', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}
                          />
                        </div>
                      )}
                      {analysis.liveCheck.screenshotMobileStorageId && (
                        <div style={{ maxWidth: '280px' }}>
                          <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                            Mobile Viewport (390 × 844)
                          </span>
                          <img
                            src={projectAPI.getScreenshotUrl(projectId, analysis.liveCheck.screenshotMobileStorageId)}
                            alt="Mobile Rendering"
                            style={{ width: '100%', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Console Errors */}
                {(analysis.liveCheck.consoleErrors || []).length > 0 && (
                  <div style={{ border: '1px solid var(--warning-border)', background: 'var(--warning-bg)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                    <strong style={{ color: 'var(--warning-text)', fontSize: '0.9rem' }}>
                      Browser Console Errors Detected ({analysis.liveCheck.consoleErrors.length})
                    </strong>
                    <ul style={{ listStyle: 'none', padding: 0, marginTop: '0.5rem', display: 'grid', gap: '0.35rem' }}>
                      {analysis.liveCheck.consoleErrors.map((err, idx) => (
                        <li key={idx} style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--danger-text)' }}>
                          • {err.text || err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  No live deployment URL was tested for this project snapshot.
                </p>
                <button
                  onClick={handleRunLiveCheck}
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '0.75rem' }}
                  disabled={runningLiveCheck}
                >
                  Verify Live Website Now
                </button>
              </div>
            )}
          </div>

          {/* Section: Code Quality Findings */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Code Quality & Architecture Findings
            </h3>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {(analysis.codeFindings || []).length > 0 ? (
                analysis.codeFindings.map((finding, idx) => {
                  const isWarn = finding.severity === 'warning';
                  const isCrit = finding.severity === 'critical';
                  return (
                    <div
                      key={idx}
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1.25rem',
                        background: isCrit ? 'var(--danger-bg)' : isWarn ? 'var(--warning-bg)' : 'var(--bg-surface)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {finding.title}
                        </h4>
                        <span className={`badge ${isCrit ? 'badge-danger' : isWarn ? 'badge-warning' : 'badge-info'}`}>
                          {finding.severity}
                        </span>
                      </div>

                      {finding.filePath && (
                        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Location: <code>{finding.filePath}</code>
                        </p>
                      )}

                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                        <strong>Evidence:</strong> {finding.evidence}
                      </p>

                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        <strong>Explanation:</strong> {finding.explanation}
                      </p>

                      <div
                        style={{
                          fontSize: '0.85rem',
                          background: 'var(--bg-surface)',
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          marginTop: '0.65rem'
                        }}
                      >
                        <strong style={{ color: 'var(--primary)' }}>Suggested Fix: </strong>
                        {finding.suggestedFix}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '1rem', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', color: 'var(--success-text)', fontSize: '0.9rem', fontWeight: 600 }}>
                  ✓ Inspected source code conforms to baseline quality and structure standards.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
