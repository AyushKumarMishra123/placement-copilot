import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { jobAPI, applicationAPI } from '../services/api';
import Alert from '../components/Alert';

const JobDetail = () => {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState(null);
  const [saving, setSaving] = useState(false);

  // Application Tracking Modal / Form State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [appStatus, setAppStatus] = useState('Applied');
  const [appNotes, setAppNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadJobDetails();
  }, [jobId]);

  const loadJobDetails = async () => {
    setLoading(true);
    try {
      const res = await jobAPI.getById(jobId);
      const jobData = res.data.data?.job;
      setJob(jobData);
      if (jobData?.application) {
        setApplication(jobData.application);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load job details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToTracker = async (statusToSet = 'Saved') => {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const res = await applicationAPI.create({
        jobId: job._id,
        status: statusToSet,
        notes: appNotes,
        followUpDate: followUpDate || null
      });

      setApplication(res.data.data.application);
      setMessage(`Successfully tracked in your Application Tracker as "${statusToSet}".`);
      setShowApplyModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update application tracker.');
    } finally {
      setSaving(false);
    }
  };

  const getMatchColor = (score) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--primary)';
    if (score >= 40) return 'var(--warning)';
    return 'var(--text-muted)';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        <p>Loading position details...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>Job Not Found</h2>
        <p style={{ color: 'var(--text-secondary)' }}>The requested position may have been closed or removed.</p>
        <Link to="/jobs" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          &larr; Back to Job Board
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '980px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <Link to="/jobs" style={{ fontSize: '0.88rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          &larr; Back to all job openings
        </Link>
      </div>

      {message && <Alert variant="success" message={message} onClose={() => setMessage('')} />}
      {error && <Alert variant="danger" message={error} onClose={() => setError('')} />}

      {/* Main Header Card */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span className="badge badge-neutral" style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                {job.sourceType === 'admin' ? 'Campus / MSOT Official' : job.sourceName || 'External Feed'}
              </span>
              <span className="badge badge-info" style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                {job.workplaceType}
              </span>
              <span className="badge badge-secondary" style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                {job.employmentType}
              </span>
            </div>

            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.35rem' }}>
              {job.title}
            </h1>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
              {job.company} &bull; {job.location} {job.salary ? `\u2022 ${job.salary}` : ''}
            </h2>
          </div>

          {/* Match Score Gauge */}
          <div
            style={{
              textAlign: 'center',
              background: 'var(--bg-subtle)',
              padding: '1rem 1.75rem',
              borderRadius: 'var(--radius-md)',
              minWidth: '150px',
              border: `2px solid ${getMatchColor(job.matchScore || 0)}`
            }}
          >
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              Match Rating
            </div>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: getMatchColor(job.matchScore || 0), lineHeight: 1.1 }}>
              {job.matchScore || 0}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Profile Correlation
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-color)',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              Apply on Company Portal
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>

            <button
              onClick={() => setShowApplyModal(true)}
              className="btn btn-secondary"
            >
              {application ? `Tracked: ${application.status} \u270E` : '+ Track Application'}
            </button>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Verified on {new Date(job.lastVerifiedAt || job.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Explainable 5-Factor Match Breakdown */}
      <div className="card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
          Explainable Profile Match Analysis
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.25rem' }}>
          {/* Matched Skills */}
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--success)', display: 'block', marginBottom: '0.5rem' }}>
              &#10003; Matched Skills ({job.matchedSkills?.length || 0})
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {job.matchedSkills && job.matchedSkills.length > 0 ? (
                job.matchedSkills.map((s, idx) => (
                  <span key={idx} className="badge badge-success" style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                    {s}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No direct overlap with listed keywords</span>
              )}
            </div>
          </div>

          {/* Missing Skills */}
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--warning)', display: 'block', marginBottom: '0.5rem' }}>
              ! Missing or Unverified Skills ({job.missingSkills?.length || 0})
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {job.missingSkills && job.missingSkills.length > 0 ? (
                job.missingSkills.map((s, idx) => (
                  <span key={idx} className="badge badge-warning" style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                    {s}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>All core required skills verified in your profile</span>
              )}
            </div>
          </div>
        </div>

        {/* Reasons */}
        {job.matchingReasons && job.matchingReasons.length > 0 && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Matching Insights:</span>
            <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'grid', gap: '0.25rem' }}>
              {job.matchingReasons.map((r, idx) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Job Description Card */}
      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>
          Role Description & Requirements
        </h3>

        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
          {job.description}
        </div>
      </div>

      {/* Track Application Modal */}
      {showApplyModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Track Application: {job.company}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Explicitly record your application submission status and follow-up reminders.
            </p>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Application Status</label>
              <select
                className="input"
                value={appStatus}
                onChange={(e) => setAppStatus(e.target.value)}
                style={{ width: '100%', padding: '0.65rem' }}
              >
                <option value="Saved">Saved (Bookmarked for later)</option>
                <option value="Applied">Applied (Confirmed submission on employer portal)</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Interview">Interview Scheduled</option>
                <option value="Offer">Offer Received</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Follow-Up Date</label>
              <input
                type="date"
                className="input"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                style={{ width: '100%', padding: '0.65rem' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Personal Notes</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="e.g. Applied with Resume v2, referred by campus senior on LinkedIn..."
                value={appNotes}
                onChange={(e) => setAppNotes(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="btn btn-secondary"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveToTracker(appStatus)}
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save to Tracker'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetail;
