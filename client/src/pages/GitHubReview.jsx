import React, { useState, useEffect } from 'react';
import { githubAPI, profileAPI } from '../services/api';

const GitHubReview = () => {
  const [usernameInput, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(true);
  const [currentReview, setCurrentReview] = useState(null);
  const [reviewsHistory, setReviewsHistory] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setFetchingHistory(true);
    try {
      // 1. Check if user already has a GitHub username in profile
      try {
        const profileRes = await profileAPI.get();
        const profile = profileRes.data.data?.profile;
        if (profile?.github) {
          const clean = profile.github.replace(/https?:\/\/(www\.)?github\.com\//i, '').replace(/\/+$/, '');
          setUsernameInput(clean);
        }
      } catch (_) {}

      // 2. Fetch previous reviews
      const reviewsRes = await githubAPI.getReviews();
      const reviews = reviewsRes.data.data?.reviews || [];
      setReviewsHistory(reviews);
      if (reviews.length > 0) {
        setCurrentReview(reviews[0]);
        if (!usernameInput && reviews[0].username) {
          setUsernameInput(reviews[0].username);
        }
      }
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setFetchingHistory(false);
    }
  };

  const handleAnalyze = async (e) => {
    e?.preventDefault();
    if (!usernameInput.trim()) {
      setError('Please enter a GitHub username or profile URL.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await githubAPI.analyze(usernameInput.trim());
      const newReview = res.data.data?.review;
      setCurrentReview(newReview);
      setReviewsHistory((prev) => [newReview, ...prev.filter((r) => r._id !== newReview._id)]);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to analyze GitHub profile.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHistorical = async (reviewId) => {
    setLoading(true);
    try {
      const res = await githubAPI.getReviewById(reviewId);
      setCurrentReview(res.data.data?.review);
    } catch (err) {
      setError('Could not load selected review snapshot.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div className="page-container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          GitHub Profile Intelligence
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Evaluate your public GitHub presence, profile README, commit activity, and portfolio showcase.
        </p>
      </header>

      {/* Input Form */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <form onSubmit={handleAnalyze} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1', minWidth: '280px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              GitHub Username or Profile URL
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. AyushKumarMishra123 or https://github.com/AyushKumarMishra123"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              disabled={loading}
              style={{ width: '100%', padding: '0.65rem 0.85rem' }}
            />
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', minWidth: '160px', justifyContent: 'center' }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: '16px', height: '16px' }} />
                  Analyzing API...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                  </svg>
                  Analyze Profile
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="alert alert-danger" style={{ marginTop: '1rem' }}>
            <strong>Analysis Notice:</strong> {error}
          </div>
        )}
      </div>

      {currentReview ? (
        <div style={{ display: 'grid', gap: '2rem' }}>
          {/* Header Snapshot Card */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                {currentReview.profileSnapshot?.avatarUrl && (
                  <img
                    src={currentReview.profileSnapshot.avatarUrl}
                    alt={currentReview.username}
                    style={{ width: '76px', height: '76px', borderRadius: '50%', border: '3px solid var(--border-color)' }}
                  />
                )}
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>
                    {currentReview.profileSnapshot?.name || currentReview.username}
                  </h2>
                  <a
                    href={currentReview.profileUrl || `https://github.com/${currentReview.username}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '0.9rem', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem' }}
                  >
                    @{currentReview.username}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                  {currentReview.profileSnapshot?.bio && (
                    <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
                      {currentReview.profileSnapshot.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Score Display */}
              <div
                style={{
                  textAlign: 'center',
                  background: 'var(--bg-subtle)',
                  padding: '1rem 1.75rem',
                  borderRadius: 'var(--radius-md)',
                  minWidth: '150px'
                }}
              >
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Profile Score
                </div>
                <div
                  style={{
                    fontSize: '2.5rem',
                    fontWeight: 800,
                    color: getScoreColor(currentReview.score ?? currentReview.githubScore ?? 0),
                    lineHeight: 1.1
                  }}
                >
                  {currentReview.score ?? currentReview.githubScore ?? 0}
                  <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>/100</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Reviewed {new Date(currentReview.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '1rem',
                marginTop: '1.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid var(--border-color)'
              }}
            >
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Public Repos</span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                  {currentReview.profileSnapshot?.publicRepos ?? 0}
                </strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Profile README</span>
                <strong
                  style={{
                    fontSize: '0.9rem',
                    color: currentReview.profileSnapshot?.hasProfileReadme ? 'var(--success)' : 'var(--danger)'
                  }}
                >
                  {currentReview.profileSnapshot?.hasProfileReadme ? 'Present' : 'Missing'}
                </strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Recent Commits (90d)</span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                  {currentReview.profileSnapshot?.recentActivity?.commitsInWindow ?? 0}
                </strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Followers</span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                  {currentReview.profileSnapshot?.followers ?? 0}
                </strong>
              </div>
            </div>
          </div>

          {/* Evidence-Based Findings */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Profile Evaluation & Actionable Findings
            </h3>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {(currentReview.findings || []).map((finding, idx) => {
                const isPass = finding.status === 'pass';
                const isWarn = finding.status === 'warning';
                return (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.25rem',
                      background: isPass ? 'var(--bg-surface)' : isWarn ? 'var(--warning-bg)' : 'var(--danger-bg)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {finding.title}
                      </h4>
                      <span
                        className={`badge ${isPass ? 'badge-success' : isWarn ? 'badge-warning' : 'badge-danger'}`}
                        style={{ textTransform: 'capitalize' }}
                      >
                        {finding.status}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      <strong>Evidence:</strong> {finding.evidence}
                    </p>

                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      <strong>Why it matters:</strong> {finding.whyItMatters}
                    </p>

                    <div
                      style={{
                        fontSize: '0.875rem',
                        background: 'var(--bg-surface)',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <strong style={{ color: 'var(--primary)' }}>Action Plan: </strong>
                      {finding.suggestedAction}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Repositories Overview */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                Repositories & Portfolio Candidates ({currentReview.repositories?.length || 0})
              </h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Top repositories analyzed from public profile
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1rem' }}>
              {(currentReview.repositories || []).slice(0, 12).map((repo, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.1rem',
                    background: 'var(--bg-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--primary)', wordBreak: 'break-word' }}
                      >
                        {repo.name}
                      </a>
                      {repo.isPinned && (
                        <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                          Featured
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.4rem', minHeight: '38px' }}>
                      {repo.description || <em style={{ color: 'var(--text-muted)' }}>No description provided.</em>}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)', fontSize: '0.785rem', color: 'var(--text-muted)' }}>
                    <span>{repo.language || 'Documentation'}</span>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <span>★ {repo.stars}</span>
                      <span>⑂ {repo.forks}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Historical Reviews */}
          {reviewsHistory.length > 1 && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
                Review History ({reviewsHistory.length} snapshots)
              </h3>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {reviewsHistory.map((rev) => (
                  <button
                    key={rev._id}
                    onClick={() => handleSelectHistorical(rev._id)}
                    className={`btn btn-sm ${currentReview._id === rev._id ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {new Date(rev.createdAt).toLocaleDateString()} — Score: {rev.score ?? rev.githubScore ?? 0}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : fetchingHistory ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Checking for existing GitHub reviews...</p>
        </div>
      ) : (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }}
          >
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
          </svg>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>No GitHub Analysis Yet</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '460px', margin: '0.5rem auto 1.5rem' }}>
            Enter your GitHub username or profile URL above to fetch your public repositories, inspect activity, and receive actionable profile recommendations.
          </p>
        </div>
      )}
    </div>
  );
};

export default GitHubReview;
