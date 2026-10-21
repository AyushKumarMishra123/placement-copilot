import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { interviewAPI } from '../services/api';
import Alert from '../components/Alert';

const InterviewReport = () => {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await interviewAPI.getById(id);
      setSession(res.data.data.session);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load interview report.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryEvaluation = async () => {
    setRetrying(true);
    setError('');
    try {
      const res = await interviewAPI.retryEvaluation(id);
      setSession(res.data.data.session);
    } catch (err) {
      setError(err.response?.data?.message || 'Evaluation retry failed.');
    } finally {
      setRetrying(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'var(--success)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        <p>Loading evaluation scorecard...</p>
      </div>
    );
  }

  const evaluation = session?.evaluation;

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
              <span className="badge badge-success" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
                Evaluated Transcript
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {session?.durationMinutes} min session &bull; {new Date(session?.completedAt || session?.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Mock Interview Scorecard: {session?.targetRole}
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to="/readiness" className="btn btn-secondary btn-sm">
              Placement Readiness &rarr;
            </Link>
            <Link to="/interview" className="btn btn-primary btn-sm">
              New Interview
            </Link>
          </div>
        </div>
      </header>

      {error && <Alert variant="danger" message={error} onClose={() => setError('')} />}

      {session?.status === 'evaluation_failed' && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem', border: '1px solid var(--danger)' }}>
          <h3 style={{ color: 'var(--danger)', fontSize: '1.2rem', fontWeight: 700 }}>Evaluation Pending / Interrupted</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0.5rem auto 1.5rem' }}>
            The AI scoring service encountered a temporary timeout. Your answers are completely saved. Click below to re-evaluate without losing your transcript.
          </p>
          <button onClick={handleRetryEvaluation} className="btn btn-primary" disabled={retrying}>
            {retrying ? 'Evaluating Transcript...' : 'Retry Rubric Evaluation'}
          </button>
        </div>
      )}

      {evaluation && (
        <>
          {/* Hero Score Card */}
          <div
            className="card"
            style={{
              padding: '2rem',
              marginBottom: '2rem',
              background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-subtle) 100%)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
              <div style={{ flex: '1', minWidth: '280px' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Overall Interview Readiness
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.25rem 0 0.5rem' }}>
                  {evaluation.overallScore >= 75
                    ? 'Placement Ready Performance'
                    : evaluation.overallScore >= 50
                    ? 'Almost Ready — Targeted Practice Recommended'
                    : 'Needs Foundational Preparation'}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                  This score directly feeds into the 20% mock interview weight in your official Placement Readiness Score.
                </p>
              </div>

              <div
                style={{
                  textAlign: 'center',
                  background: 'var(--bg-surface)',
                  padding: '1.25rem 2rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  minWidth: '160px'
                }}
              >
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Rubric Total
                </div>
                <div
                  style={{
                    fontSize: '2.75rem',
                    fontWeight: 800,
                    color: getScoreColor(evaluation.overallScore),
                    lineHeight: 1.1
                  }}
                >
                  {evaluation.overallScore}
                  <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>/100</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Weighted Across 5 Dimensions
                </div>
              </div>
            </div>

            {/* 5-Dimension Score Progress Bars */}
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                Dimension Breakdown (Official 100-Point Rubric)
              </h3>

              <div style={{ display: 'grid', gap: '1.25rem' }}>
                {(evaluation.dimensions || []).map((dim, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {dim.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({dim.weight}%)</span>
                      </span>
                      <strong style={{ fontSize: '0.92rem', color: getScoreColor(dim.score) }}>
                        {dim.score} / 100
                      </strong>
                    </div>

                    <div style={{ background: '#e2e8f0', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                      <div
                        style={{
                          background: getScoreColor(dim.score),
                          width: `${dim.score}%`,
                          height: '100%',
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>

                    {dim.feedback && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: '0.3rem 0 0' }}>
                        {dim.feedback}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Strengths and Weaknesses Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card" style={{ padding: '1.75rem', borderTop: '3px solid var(--success)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--success)' }}>&#10003;</span> Demonstrated Strengths
              </h3>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'grid', gap: '0.65rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                {(evaluation.strengths || []).map((str, idx) => (
                  <li key={idx}>{str}</li>
                ))}
              </ul>
            </div>

            <div className="card" style={{ padding: '1.75rem', borderTop: '3px solid var(--warning)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--warning)' }}>!</span> Priority Growth Areas
              </h3>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'grid', gap: '0.65rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                {(evaluation.weaknesses || []).map((wk, idx) => (
                  <li key={idx}>{wk}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recommendations Card */}
          {evaluation.recommendations && evaluation.recommendations.length > 0 && (
            <div className="card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
                Personalized Preparation Recommendations
              </h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {evaluation.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.85rem 1rem',
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: '3px solid var(--primary)',
                      fontSize: '0.88rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Question by Question Detailed Review */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>
              Detailed Question & Transcript Review ({session?.transcript?.length || 0})
            </h3>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {(session?.transcript || []).map((item, idx) => {
                const qEval = evaluation.questionEvaluations?.find((qe) => qe.questionId === item.questionId);

                return (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.25rem',
                      background: 'var(--bg-surface)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.65rem' }}>
                      <div>
                        <span className="badge badge-neutral" style={{ fontSize: '0.72rem', textTransform: 'capitalize', marginRight: '0.5rem' }}>
                          {item.category?.replace('_', ' ') || 'Technical'}
                        </span>
                        <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                          Question #{idx + 1}
                        </strong>
                      </div>

                      {qEval && (
                        <span className={`badge ${qEval.score >= 75 ? 'badge-success' : qEval.score >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                          Score: {qEval.score}/100
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.85rem' }}>
                      {item.questionText}
                    </p>

                    <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                        Your Submitted Response:
                      </span>
                      <p style={{ fontSize: '0.88rem', color: item.skipped ? 'var(--text-muted)' : 'var(--text-primary)', margin: 0, whiteSpace: 'pre-wrap', fontStyle: item.skipped ? 'italic' : 'normal' }}>
                        {item.skipped ? '[Candidate skipped this question]' : item.answerText}
                      </p>
                    </div>

                    {qEval && (
                      <div style={{ display: 'grid', gap: '0.35rem', fontSize: '0.82rem' }}>
                        {qEval.feedback && (
                          <div style={{ color: 'var(--text-secondary)' }}>
                            <strong>Feedback: </strong> {qEval.feedback}
                          </div>
                        )}
                        {qEval.suggestedImprovement && (
                          <div style={{ color: 'var(--primary)' }}>
                            <strong>How to Improve: </strong> {qEval.suggestedImprovement}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default InterviewReport;
