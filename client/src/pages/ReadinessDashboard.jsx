import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { readinessAPI } from '../services/api';

const ReadinessDashboard = () => {
  const [assessment, setAssessment] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReadinessData();
  }, []);

  const loadReadinessData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, historyRes] = await Promise.allSettled([
        readinessAPI.get(),
        readinessAPI.getHistory()
      ]);

      if (res.status === 'fulfilled' && res.value.data.data?.assessment) {
        setAssessment(res.value.data.data.assessment);
      }
      if (historyRes.status === 'fulfilled' && historyRes.value.data.data?.history) {
        setHistory(historyRes.value.data.data.history);
      }
    } catch (err) {
      setError('Could not load placement readiness data.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    setError(null);
    try {
      const res = await readinessAPI.recalculate();
      const updated = res.data.data?.assessment;
      setAssessment(updated);
      setHistory((prev) => [updated, ...prev.filter((h) => h._id !== updated._id)]);
    } catch (err) {
      setError(err.response?.data?.message || 'Recalculation failed.');
    } finally {
      setRecalculating(false);
    }
  };

  const handleSelectSnapshot = async (id) => {
    setLoading(true);
    try {
      const res = await readinessAPI.getById(id);
      setAssessment(res.data.data?.assessment);
    } catch (err) {
      setError('Failed to load historical snapshot.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score === null || score === undefined) return 'var(--text-muted)';
    if (score >= 75) return 'var(--success)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'assessed':
        return <span className="badge badge-success">Assessed</span>;
      case 'processing':
        return <span className="badge badge-info">Processing</span>;
      case 'stale':
        return <span className="badge badge-warning">Needs Refresh</span>;
      case 'failed':
        return <span className="badge badge-danger">Failed</span>;
      case 'not_assessed':
      default:
        return <span className="badge" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>Not Assessed</span>;
    }
  };

  const getComponentLink = (key) => {
    switch (key) {
      case 'resume':
        return { to: '/resume-review', text: 'Resume Review' };
      case 'projects':
        return { to: '/projects', text: 'Project Code Audit' };
      case 'github':
        return { to: '/github-review', text: 'GitHub Profile Audit' };
      case 'linkedin':
        return { to: '/linkedin-review', text: 'LinkedIn Profile Review' };
      case 'achievements':
        return { to: '/achievements-assessment', text: 'Co-Curricular Assessment' };
      case 'interview':
        return { to: '/interview', text: 'Mock Interview' };
      case 'coding':
        return { to: '/coding', text: 'Coding Assessment' };
      default:
        return null;
    }
  };


  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Calculating placement readiness engine...</p>
      </div>
    );
  }

  const isProvisional = assessment?.scoreStatus === 'provisional';
  const hasScore = assessment?.score !== null && assessment?.score !== undefined;

  return (
    <div className="page-container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Placement Readiness Scoring Engine
            </h1>
            <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
              Engine Active
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', fontSize: '0.95rem' }}>
            Traceable, multi-component readiness calculation derived from real student assessments and campus hiring benchmarks.
          </p>
        </div>

        <button
          onClick={handleRecalculate}
          className="btn btn-primary"
          disabled={recalculating}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', minWidth: '170px', justifyContent: 'center' }}
        >
          {recalculating ? (
            <>
              <span className="spinner" style={{ width: '15px', height: '15px' }} />
              Recalculating...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Recalculate Score
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <strong>Notice:</strong> {error}
        </div>
      )}

      {/* Main Readiness Score Hero Card */}
      <div
        className="card"
        style={{
          padding: '2rem',
          marginBottom: '2rem',
          borderLeft: isProvisional ? '4px solid var(--warning)' : '4px solid var(--success)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem' }}>
          <div style={{ flex: '1', minWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: isProvisional ? 'var(--warning-text)' : 'var(--success-text)'
                }}
              >
                {isProvisional ? 'Provisional Assessment' : 'Final Certified Assessment'}
              </span>
              <span className={`badge ${isProvisional ? 'badge-warning' : 'badge-success'}`}>
                {assessment?.readinessLevel || 'Unassessed'}
              </span>
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
              {isProvisional ? 'Provisional Placement Readiness' : 'Overall Placement Readiness'}
            </h2>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.5, maxWidth: '620px' }}>
              {isProvisional
                ? `Provisional score normalized from currently completed components (${assessment?.coveragePercent || 0}% weighted coverage). Missing components are excluded from the denominator rather than penalized as zero.`
                : 'All 7 official assessment components are complete. This is your final placement-readiness score.'}
            </p>

            {/* Coverage Meter */}
            <div style={{ marginTop: '1.25rem', maxWidth: '480px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Assessment Coverage</span>
                <span style={{ color: 'var(--text-secondary)' }}>{assessment?.coveragePercent || 0}% of official weights</span>
              </div>
              <div style={{ background: 'var(--bg-subtle)', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                <div
                  style={{
                    background: assessment?.coveragePercent === 100 ? 'var(--success)' : 'var(--primary)',
                    width: `${assessment?.coveragePercent || 0}%`,
                    height: '100%',
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Large Score Indicator */}
          <div
            style={{
              textAlign: 'center',
              background: 'var(--bg-subtle)',
              padding: '1.5rem 2rem',
              borderRadius: 'var(--radius-md)',
              minWidth: '170px'
            }}
          >
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
              {isProvisional ? 'Provisional Score' : 'Final Score'}
            </div>
            <div
              style={{
                fontSize: '3rem',
                fontWeight: 800,
                color: getScoreColor(assessment?.score),
                lineHeight: 1.1,
                marginTop: '0.25rem'
              }}
            >
              {hasScore ? assessment.score : '—'}
              {hasScore && <span style={{ fontSize: '1.15rem', color: 'var(--text-muted)', fontWeight: 500 }}>/100</span>}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              {assessment?.createdAt ? `Evaluated ${new Date(assessment.createdAt).toLocaleDateString()}` : 'Not evaluated yet'}
            </div>
          </div>
        </div>
      </div>

      {/* 7 Official Assessment Components */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              Contributing Assessment Components
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
              Official weights sum to exactly 100%. Scores are strictly extracted from real student assessment records.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {(assessment?.components || []).map((comp) => {
            const link = getComponentLink(comp.key);
            const isAssessed = comp.status === 'assessed' && comp.score !== null;

            return (
              <div
                key={comp.key}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.15rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  background: isAssessed ? 'var(--bg-surface)' : 'var(--bg-subtle)'
                }}
              >
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', minWidth: '240px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: 'var(--radius-sm)',
                      background: isAssessed ? 'var(--primary-light)' : '#e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isAssessed ? 'var(--primary)' : 'var(--text-muted)',
                      fontWeight: 700,
                      fontSize: '0.85rem'
                    }}
                  >
                    {comp.weight}%
                  </div>

                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      {comp.label}
                    </h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Official Weight: {comp.weight}%
                    </span>
                  </div>
                </div>

                {/* Score & Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div>
                    {getStatusBadge(comp.status)}
                  </div>

                  <div style={{ textAlign: 'right', minWidth: '80px' }}>
                    {isAssessed ? (
                      <span style={{ fontSize: '1.35rem', fontWeight: 800, color: getScoreColor(comp.score) }}>
                        {comp.score}
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>/100</span>
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>—</span>
                    )}
                  </div>

                  {link ? (
                    <Link to={link.to} className="btn btn-secondary btn-sm" style={{ minWidth: '130px', textAlign: 'center' }}>
                      {isAssessed ? 'View Review' : 'Run Assessment'}
                    </Link>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: '130px', textAlign: 'right' }}>
                      Scheduled
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top 5 Prioritized Improvement Actions */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            Highest-Priority Improvement Actions
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
            Deterministically ranked from your actual assessment findings to maximize your readiness score impact.
          </p>
        </div>

        {(assessment?.recommendations || []).length > 0 ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {assessment.recommendations.map((rec, idx) => (
              <div
                key={rec.id || idx}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  background: 'var(--bg-surface)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {idx + 1}
                    </span>
                    <h4 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      {rec.title}
                    </h4>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span className={`badge ${rec.priority === 'high' ? 'badge-danger' : rec.priority === 'medium' ? 'badge-warning' : 'badge-info'}`}>
                      {rec.priority.toUpperCase()} PRIORITY
                    </span>
                    <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                      {rec.sourceComponent}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.65rem' }}>
                  {rec.description}
                </p>

                {Array.isArray(rec.actionSteps) && rec.actionSteps.length > 0 && (
                  <div
                    style={{
                      background: 'var(--bg-subtle)',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.825rem'
                    }}
                  >
                    <strong style={{ color: 'var(--primary)' }}>Action Step: </strong>
                    {rec.actionSteps[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
              No critical action items identified. Complete assessments above to generate personalized improvement recommendations.
            </p>
          </div>
        )}
      </div>

      {/* Historical Assessment Snapshots */}
      {history.length > 1 && (
        <div className="card" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
            Readiness Assessment History ({history.length} snapshots)
          </h3>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {history.map((h, i) => (
              <button
                key={h._id || i}
                onClick={() => handleSelectSnapshot(h._id)}
                className={`btn btn-sm ${assessment?._id === h._id ? 'btn-primary' : 'btn-secondary'}`}
              >
                {new Date(h.createdAt).toLocaleDateString()} — {h.score !== null ? `${h.score}/100` : 'Unassessed'} ({h.scoreStatus})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadinessDashboard;
