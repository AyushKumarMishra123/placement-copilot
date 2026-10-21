import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminStudentAPI } from '../../services/api';
import Alert from '../../components/Alert';

const AdminInterviews = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInterviews = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminStudentAPI.getInterviewsOverview();
      setInterviews(res.data?.data?.interviews || []);
    } catch (err) {
      console.error('[Admin Interviews Error]', err);
      setError(err.response?.data?.message || 'Failed to load interviews overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1.25rem'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            Mock Interview Results & Evaluations
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', fontSize: '0.95rem' }}>
            Inspect candidate technical mock interview performances, scoring breakdowns, and transcripts.
          </p>
        </div>

        <button onClick={fetchInterviews} className="btn btn-secondary btn-sm">
          🔄 Refresh
        </button>
      </div>

      <Alert variant="danger" message={error} onClose={() => setError('')} />

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading interview sessions...</p>
          </div>
        ) : interviews.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No mock interview records completed yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Candidate</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Target Role</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Duration</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Overall Score</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Completed Date</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {interviews.map((iv) => (
                  <tr key={iv.sessionId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <Link to={`/admin/students/${iv.studentId}`} style={{ fontWeight: 700 }}>
                        {iv.studentName}
                      </Link>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{iv.studentEmail}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{iv.targetRole}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>{iv.durationMinutes} mins</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '999px',
                          background: iv.status === 'completed' ? '#ecfdf5' : '#fef2f2',
                          color: iv.status === 'completed' ? '#065f46' : '#991b1b'
                        }}
                      >
                        {iv.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {iv.overallScore !== null ? (
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: '1rem',
                            color: iv.overallScore >= 75 ? '#065f46' : iv.overallScore >= 50 ? '#1e40af' : '#991b1b'
                          }}
                        >
                          {iv.overallScore}/100
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Awaiting evaluation</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {iv.completedAt ? new Date(iv.completedAt).toLocaleDateString() : 'In progress'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <Link to={`/admin/students/${iv.studentId}`} className="btn btn-outline btn-sm">
                        Inspect Transcript →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminInterviews;
