import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { interviewAPI, profileAPI } from '../services/api';
import Alert from '../components/Alert';

const InterviewSetup = () => {
  const navigate = useNavigate();
  const [targetRole, setTargetRole] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [focus, setFocus] = useState('general');
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(true);
  const [interviews, setInterviews] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setFetchingHistory(true);
    try {
      // 1. Fetch user profile to prefill target role
      try {
        const profRes = await profileAPI.get();
        const prof = profRes.data.data?.profile;
        if (prof?.targetRole) {
          setTargetRole(prof.targetRole);
        }
      } catch (_) {}

      // 2. Fetch past interviews
      const intRes = await interviewAPI.getAll();
      setInterviews(intRes.data.data?.interviews || []);
    } catch (err) {
      console.warn('Could not load interview history:', err);
    } finally {
      setFetchingHistory(false);
    }
  };

  const handleStartInterview = async (e) => {
    e.preventDefault();
    if (!targetRole.trim()) {
      return setError('Please enter a target job role for the interview.');
    }

    setLoading(true);
    setError('');

    try {
      const res = await interviewAPI.start({
        targetRole: targetRole.trim(),
        durationMinutes: Number(durationMinutes),
        focus
      });

      const session = res.data.data.session;
      // Navigate directly into active session
      navigate(`/interview/${session._id}`);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to initialize interview.';
      setError(msg);
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'var(--success)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <span className="badge badge-info" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
            AI Mock Interview
          </span>
          <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
            20% Official Readiness Weight
          </span>
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Technical & Behavioral Mock Interview
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Real-time timed text interview personalized to your verified resume, GitHub repositories, and target role.
        </p>
      </header>

      {error && <Alert variant="danger" message={error} onClose={() => setError('')} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Interview Configuration Card */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Configure New Interview Session
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Our AI interviewer extracts architectural details from your portfolio projects to simulate realistic hiring manager screens.
          </p>

          <form onSubmit={handleStartInterview}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Target Job Role <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. SDE 1, Backend Developer, Frontend Engineer"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                required
                disabled={loading}
                style={{ width: '100%', padding: '0.65rem 0.85rem' }}
              />
              <span className="form-hint" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Questions will be calibrated to this seniority and engineering domain.
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Session Duration
              </label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: durationMinutes === 15 ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    background: durationMinutes === 15 ? 'var(--primary-light)' : 'var(--bg-surface)',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="duration"
                    value={15}
                    checked={durationMinutes === 15}
                    onChange={() => setDurationMinutes(15)}
                    disabled={loading}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>15 Minutes</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>5 Core Questions</div>
                  </div>
                </label>

                <label
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: durationMinutes === 20 ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    background: durationMinutes === 20 ? 'var(--primary-light)' : 'var(--bg-surface)',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="duration"
                    value={20}
                    checked={durationMinutes === 20}
                    onChange={() => setDurationMinutes(20)}
                    disabled={loading}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>20 Minutes</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>6 Deep Dive Questions</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Domain Focus
              </label>
              <select
                className="input"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                disabled={loading}
                style={{ width: '100%', padding: '0.65rem 0.85rem' }}
              >
                <option value="general">General Software Engineering (Recommended)</option>
                <option value="backend">Backend & System Fundamentals</option>
                <option value="frontend">Frontend & Web Performance</option>
                <option value="projects">Project Architecture Deep Dive</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '1rem',
                fontWeight: 700,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: '18px', height: '18px' }} />
                  Generating Personalized Questions...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Start {durationMinutes}-Minute Mock Interview
                </>
              )}
            </button>
          </form>
        </div>

        {/* Rubric and Interview Rules Card */}
        <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
              Official Evaluation Rubric (100 Points)
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.85rem', fontSize: '0.88rem' }}>
              <li style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <span><strong>Technical Accuracy & Fundamentals:</strong> Concurrency, memory, API latency</span>
                <span className="badge badge-info">30%</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <span><strong>Project Architecture:</strong> Explaining trade-offs in your own codebase</span>
                <span className="badge badge-info">25%</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <span><strong>Problem-Solving & Debugging:</strong> Methodical root-cause investigation</span>
                <span className="badge badge-info">20%</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <span><strong>Communication & Structure:</strong> STAR framework and concise clarity</span>
                <span className="badge badge-info">15%</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>HR & Collaboration:</strong> Resolving team conflict and receiving feedback</span>
                <span className="badge badge-info">10%</span>
              </li>
            </ul>
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <strong>Session Guarantee:</strong> Reconnecting or refreshing your browser preserves your timer and saved answers. Upon completion, your score automatically updates your Placement Readiness Score.
          </div>
        </div>
      </div>

      {/* Historical Interviews Section */}
      <div className="card" style={{ padding: '2rem', marginTop: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              Past Mock Interview Records
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
              All transcripts and rubric evaluations are permanently stored.
            </p>
          </div>
          <span className="badge badge-neutral">{interviews.length} Sessions</span>
        </div>

        {fetchingHistory ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <span className="spinner" style={{ width: '20px', height: '20px', margin: '0 auto 0.5rem' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading interview records...</p>
          </div>
        ) : interviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
            <p style={{ margin: 0 }}>No completed interview sessions yet. Start your first session above!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {interviews.map((item) => {
              const isCompleted = item.status === 'completed';
              const hasScore = item.evaluation?.overallScore !== undefined;

              return (
                <div
                  key={item._id}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.15rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    background: 'var(--bg-surface)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        {item.targetRole}
                      </strong>
                      <span className={`badge ${isCompleted ? 'badge-success' : 'badge-warning'}`}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {item.durationMinutes} min &bull; {new Date(item.createdAt).toLocaleDateString()} &bull; {item.focus || 'general'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    {hasScore && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Rubric Score
                        </div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: getScoreColor(item.evaluation.overallScore) }}>
                          {item.evaluation.overallScore}
                          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>/100</span>
                        </div>
                      </div>
                    )}

                    {isCompleted ? (
                      <Link to={`/interview/${item._id}/report`} className="btn btn-secondary btn-sm">
                        View Report &rarr;
                      </Link>
                    ) : (
                      <Link to={`/interview/${item._id}`} className="btn btn-primary btn-sm">
                        Resume Session &rarr;
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewSetup;
