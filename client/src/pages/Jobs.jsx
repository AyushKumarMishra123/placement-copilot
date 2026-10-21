import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { jobAPI, applicationAPI, profileAPI } from '../services/api';
import Alert from '../components/Alert';

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [cached, setCached] = useState(false);

  // Search & Filter State
  const [search, setSearch] = useState('software engineer internship');
  const [location, setLocation] = useState('Bengaluru, Karnataka, India');
  const [employmentType, setEmploymentType] = useState('');
  const [workMode, setWorkMode] = useState('');

  // Status & Tracking
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [savingJobId, setSavingJobId] = useState(null);

  // Modals & Active Selections
  const [selectedJob, setSelectedJob] = useState(null);
  const [confirmApplyJob, setConfirmApplyJob] = useState(null);
  const [applyNotes, setApplyNotes] = useState('');

  // Alerts & Errors
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');

  // Initialize search with student profile preferences if available
  useEffect(() => {
    let isMounted = true;
    const initDefaultsAndSearch = async () => {
      try {
        const profileRes = await profileAPI.get();
        const profile = profileRes.data?.data?.profile;
        if (isMounted && profile) {
          if (profile.targetRole) {
            setSearch(`${profile.targetRole} internship`);
          }
          if (profile.location) {
            setLocation(profile.location);
          }
        }
      } catch (_) {
        // Fallback to default search query
      }
      if (isMounted) {
        performSearch({ initial: true });
      }
    };

    initDefaultsAndSearch();
    return () => {
      isMounted = false;
    };
  }, []);

  const performSearch = useCallback(
    async ({ pageToken = null, append = false, initial = false } = {}) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError('');
      setErrorCode('');

      try {
        const res = await jobAPI.search({
          q: search,
          location,
          employmentType,
          workMode,
          nextPageToken: pageToken
        });

        const fetchedJobs = res.data.data?.jobs || [];
        const nextToken = res.data.data?.nextPageToken || null;
        setNextPageToken(nextToken);
        setCached(Boolean(res.data.data?.cached));

        if (append) {
          setJobs((prev) => {
            const existingIds = new Set(prev.map((j) => j.externalId || j._id));
            const fresh = fetchedJobs.filter((j) => !existingIds.has(j.externalId || j._id));
            return [...prev, ...fresh];
          });
        } else {
          setJobs(fetchedJobs);
        }

        // Sync saved and applied statuses from returned data
        setSavedJobIds((prev) => {
          const updated = new Set(prev);
          fetchedJobs.forEach((j) => {
            if (j.applicationStatus) {
              updated.add(j.externalId || j._id);
            }
          });
          return updated;
        });

        setAppliedJobIds((prev) => {
          const updated = new Set(prev);
          fetchedJobs.forEach((j) => {
            if (j.applicationStatus === 'Applied') {
              updated.add(j.externalId || j._id);
            }
          });
          return updated;
        });
      } catch (err) {
        const code = err.response?.data?.code || err.code || 'SEARCH_FAILED';
        const msg =
          err.response?.data?.message ||
          err.message ||
          'Failed to retrieve job listings from search provider.';
        setErrorCode(code);
        setError(msg);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [search, location, employmentType, workMode]
  );

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    performSearch();
  };

  const handleClearFilters = () => {
    setSearch('software engineer internship');
    setLocation('Bengaluru, Karnataka, India');
    setEmploymentType('');
    setWorkMode('');
  };

  const handleLoadMore = () => {
    if (!nextPageToken || loadingMore) return;
    performSearch({ pageToken: nextPageToken, append: true });
  };

  const handleSaveJob = async (job) => {
    const id = job.externalId || job._id;
    setSavingJobId(id);
    setMessage('');
    setError('');

    try {
      await applicationAPI.create({
        jobId: id,
        jobData: job,
        status: 'Saved'
      });
      setSavedJobIds((prev) => new Set([...prev, id]));
      setMessage(`"${job.title}" saved to your Application Tracker.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save job to tracker.');
    } finally {
      setSavingJobId(null);
    }
  };

  const handleOpenExternalApply = (job) => {
    if (!job.applyUrl) {
      setError('No direct external application link available for this position.');
      return;
    }
    // Open in new tab safely
    window.open(job.applyUrl, '_blank', 'noopener,noreferrer');
    // Prompt the student to confirm their application once completed
    setConfirmApplyJob(job);
  };

  const handleConfirmApplied = async () => {
    if (!confirmApplyJob) return;
    const id = confirmApplyJob.externalId || confirmApplyJob._id;

    try {
      await applicationAPI.create({
        jobId: id,
        jobData: confirmApplyJob,
        status: 'Applied',
        notes: applyNotes
      });
      setSavedJobIds((prev) => new Set([...prev, id]));
      setAppliedJobIds((prev) => new Set([...prev, id]));
      setMessage(`Application confirmed and recorded as "Applied" in your Tracker!`);
      setConfirmApplyJob(null);
      setApplyNotes('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record application confirmation.');
    }
  };

  const getMatchColor = (score) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--primary)';
    if (score >= 40) return 'var(--warning)';
    return 'var(--text-muted)';
  };

  return (
    <div className="page-container" style={{ maxWidth: '1140px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Header */}
      <header className="page-header" style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
              <span className="badge badge-info" style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700 }}>
                Live Career Intelligence
              </span>
              <span className="badge badge-success" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                SerpApi Google Jobs &bull; 5-Factor Match Engine
              </span>
              {cached && (
                <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                  Cached (Fast)
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Jobs & Internships
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
              Explore real-time opportunities calibrated to your verified resume skills, GitHub portfolio, and target role.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to="/applications" className="btn btn-secondary btn-sm" style={{ fontWeight: 600 }}>
              Application Tracker &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* Alerts */}
      {message && <Alert variant="success" message={message} onClose={() => setMessage('')} />}
      {error && !errorCode.startsWith('SERPAPI_') && (
        <Alert variant="danger" message={error} onClose={() => setError('')} />
      )}

      {/* Dedicated Error State: SerpApi Not Configured */}
      {errorCode === 'SERPAPI_NOT_CONFIGURED' && (
        <div
          className="card"
          style={{
            padding: '2rem',
            marginBottom: '2rem',
            borderLeft: '4px solid var(--warning)',
            background: 'var(--warning-bg)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ fontSize: '1.8rem', lineHeight: 1 }}>⚙️</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--warning-text)', margin: '0 0 0.5rem' }}>
                SerpApi API Key Required for Live Job Discovery
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--warning-text)', margin: '0 0 1rem', lineHeight: 1.5 }}>
                To retrieve real-time job listings from Google Jobs, configure your <code>SERPAPI_API_KEY</code> in the server environment.
              </p>
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.05)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  marginBottom: '1rem'
                }}
              >
                # server/.env<br />
                SERPAPI_API_KEY=your_actual_serpapi_key_here
              </div>
              <button
                onClick={() => performSearch()}
                className="btn btn-primary btn-sm"
              >
                Retry Search After Adding Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Error State: Quota Exceeded */}
      {errorCode === 'RATE_LIMIT_EXCEEDED' && (
        <div
          className="card"
          style={{
            padding: '2rem',
            marginBottom: '2rem',
            borderLeft: '4px solid var(--danger)',
            background: 'var(--danger-bg)'
          }}
        >
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--danger-text)', margin: '0 0 0.5rem' }}>
            Provider Quota or Rate Limit Reached
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--danger-text)', margin: '0 0 1rem' }}>
            Your SerpApi account search quota has been reached. Please check your SerpApi dashboard or wait before submitting new requests.
          </p>
          <button onClick={() => performSearch()} className="btn btn-secondary btn-sm">
            Retry Search
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '2', minWidth: '260px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                Job Role / Skills / Keywords
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Software Engineer, React Developer, Intern..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem' }}
              />
            </div>

            <div style={{ flex: '1.2', minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                Location
              </label>
              <input
                type="text"
                className="input"
                placeholder="City, State, Country or Remote"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ minWidth: '130px', height: '42px', fontWeight: 700 }}
              >
                {loading ? 'Searching...' : '🔍 Search Jobs'}
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              paddingTop: '0.85rem',
              borderTop: '1px solid var(--border-color)',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Filters:</span>
              <select
                className="input"
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                style={{ padding: '0.45rem 0.65rem', fontSize: '0.82rem' }}
              >
                <option value="">All Employment Types</option>
                <option value="internship">Internship</option>
                <option value="full-time">Full-Time</option>
                <option value="contract">Contract</option>
                <option value="part-time">Part-Time</option>
              </select>

              <select
                className="input"
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
                style={{ padding: '0.45rem 0.65rem', fontSize: '0.82rem' }}
              >
                <option value="">All Work Modes</option>
                <option value="remote">Remote / Work from Home</option>
                <option value="hybrid">Hybrid</option>
                <option value="on-site">On-Site</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleClearFilters}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.78rem', marginLeft: 'auto' }}
            >
              Reset Filters
            </button>
          </div>
        </form>
      </div>

      {/* Results Header */}
      {!loading && jobs.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Showing {jobs.length} Real-Time Opportunities
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Ranked by multi-factor profile match &bull; Verified via Google Jobs
          </span>
        </div>
      )}

      {/* Main Jobs Listing State */}
      {loading ? (
        <div className="loading-container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div className="spinner" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent', margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Searching live Google Jobs via SerpApi...</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Calculating explainable match scores against your profile</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔎</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>No Matching Opportunities Found</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0.5rem auto 1.5rem', fontSize: '0.9rem' }}>
            We could not find active Google Jobs listings matching "{search}" in "{location}". Try broadening your search keywords or adjusting your location.
          </p>
          <button
            onClick={() => {
              setSearch('software engineer');
              setLocation('Bengaluru');
              setEmploymentType('');
              setWorkMode('');
            }}
            className="btn btn-primary btn-sm"
          >
            Try Broad Search
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {jobs.map((job) => {
              const jobId = job.externalId || job._id;
              const isSaved = savedJobIds.has(jobId);
              const isApplied = appliedJobIds.has(jobId);

              return (
                <div
                  key={jobId}
                  className="card"
                  style={{
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderTop: `4px solid ${getMatchColor(job.matchScore || 0)}`,
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                >
                  <div>
                    {/* Top Row: Source, Thumbnail, Match Score */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {job.thumbnail ? (
                          <img
                            src={job.thumbnail}
                            alt={job.company}
                            style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '4px', background: '#fff' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : null}
                        <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                          {job.via ? `via ${job.via}` : job.sourceName || 'Google Jobs'}
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          color: getMatchColor(job.matchScore || 0),
                          background: 'var(--bg-subtle)',
                          padding: '0.2rem 0.55rem',
                          borderRadius: 'var(--radius-sm)'
                        }}
                        title={job.matchingReasons ? job.matchingReasons.join(' | ') : ''}
                      >
                        {job.matchScore || 0}% Match
                      </span>
                    </div>

                    {/* Job Title & Company */}
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
                      {job.title}
                    </h3>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      {job.company} &bull; <span style={{ textTransform: 'capitalize' }}>{job.workplaceType}</span>
                    </div>

                    {/* Location & Posted Date */}
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      📍 {job.location || 'Remote'} {job.postedAtText ? `&bull; 🕒 ${job.postedAtText}` : ''}
                    </div>

                    {/* Matching Highlights */}
                    {job.matchingReasons && job.matchingReasons.length > 0 && (
                      <div style={{ margin: '0.5rem 0', display: 'grid', gap: '0.25rem' }}>
                        {job.matchingReasons.slice(0, 2).map((reason, idx) => (
                          <div
                            key={idx}
                            style={{
                              fontSize: '0.76rem',
                              color: 'var(--text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <span style={{ color: 'var(--success)', fontWeight: 800 }}>&#10003;</span>
                            {reason}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Extracted Skills */}
                    {job.requiredSkills && job.requiredSkills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.65rem' }}>
                        {job.requiredSkills.slice(0, 4).map((skill, idx) => (
                          <span key={idx} className="tag" style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '1.25rem',
                      paddingTop: '0.85rem',
                      borderTop: '1px solid var(--border-color)',
                      gap: '0.5rem',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => handleSaveJob(job)}
                        className="btn btn-secondary btn-sm"
                        disabled={isSaved || savingJobId === jobId}
                        style={{ fontSize: '0.78rem' }}
                      >
                        {isApplied ? 'Applied ✓' : isSaved ? 'Saved ✓' : savingJobId === jobId ? 'Saving...' : 'Save'}
                      </button>

                      <button
                        onClick={() => setSelectedJob(job)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.78rem' }}
                      >
                        View Details
                      </button>
                    </div>

                    {job.applyUrl ? (
                      <button
                        onClick={() => handleOpenExternalApply(job)}
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.78rem', fontWeight: 600 }}
                      >
                        Apply External ↗
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        No direct link
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {nextPageToken && (
            <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
              <button
                onClick={handleLoadMore}
                className="btn btn-secondary"
                disabled={loadingMore}
                style={{ minWidth: '200px', fontWeight: 600 }}
              >
                {loadingMore ? 'Loading More Listings...' : 'Load More Jobs (Next Page)'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal: Job Details View */}
      {selectedJob && (
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
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: '720px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '2rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                  {selectedJob.via ? `via ${selectedJob.via}` : selectedJob.sourceName || 'Google Jobs'}
                </span>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0.35rem 0' }}>
                  {selectedJob.title}
                </h2>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {selectedJob.company} &bull; {selectedJob.location}
                </div>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.2rem 0.5rem', fontSize: '1rem' }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '1rem 0' }}>
              <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                {selectedJob.workplaceType}
              </span>
              <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                {selectedJob.employmentType}
              </span>
              <span className="badge badge-success">
                {selectedJob.matchScore || 0}% Match Score
              </span>
            </div>

            {/* Description */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '1.25rem 0 0.5rem' }}>Job Description</h4>
            <div
              style={{
                fontSize: '0.88rem',
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
                maxHeight: '260px',
                overflowY: 'auto',
                whiteSpace: 'pre-line',
                background: 'var(--bg-subtle)',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              {selectedJob.description || 'No detailed description provided by external provider.'}
            </div>

            {/* Application Links */}
            {selectedJob.applyOptions && selectedJob.applyOptions.length > 0 && (
              <div style={{ marginTop: '1.25rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Apply Options</h4>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {selectedJob.applyOptions.map((opt, idx) => (
                    <a
                      key={idx}
                      href={opt.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.8rem' }}
                    >
                      {opt.title || 'Apply'} ↗
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <button
                onClick={() => handleSaveJob(selectedJob)}
                className="btn btn-secondary"
                disabled={savedJobIds.has(selectedJob.externalId || selectedJob._id)}
              >
                {savedJobIds.has(selectedJob.externalId || selectedJob._id) ? 'Saved in Tracker ✓' : 'Save to Tracker'}
              </button>
              {selectedJob.applyUrl && (
                <button
                  onClick={() => {
                    handleOpenExternalApply(selectedJob);
                    setSelectedJob(null);
                  }}
                  className="btn btn-primary"
                >
                  Apply on Employer Site ↗
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Explicit Application Confirmation */}
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
              You were redirected to apply at <strong>{confirmApplyJob.company}</strong> for <em>{confirmApplyJob.title}</em>.
              Did you complete and submit your application?
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Add Tracking Notes (Optional)
              </label>
              <textarea
                className="input"
                rows="2"
                placeholder="e.g. Applied with resume version 2 via company careers portal..."
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
    </div>
  );
};

export default Jobs;
