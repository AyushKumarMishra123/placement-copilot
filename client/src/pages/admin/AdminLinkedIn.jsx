import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminStudentAPI } from '../../services/api';
import Alert from '../../components/Alert';

const AdminLinkedIn = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReviews = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminStudentAPI.getLinkedInOverview();
      setReviews(res.data?.data?.reviews || []);
    } catch (err) {
      console.error('[Admin LinkedIn Error]', err);
      setError(err.response?.data?.message || 'Failed to load LinkedIn reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
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
            LinkedIn Profile Evaluations
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', fontSize: '0.95rem' }}>
            Batch overview of candidate LinkedIn presentations, headline optimization, and narrative completeness.
          </p>
        </div>

        <button onClick={fetchReviews} className="btn btn-secondary btn-sm">
          🔄 Refresh
        </button>
      </div>

      <Alert variant="danger" message={error} onClose={() => setError('')} />

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading LinkedIn review records...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No candidate LinkedIn profile reviews recorded yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Candidate</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Target Role</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Profile Link</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Review Score</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Reviewed Date</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.reviewId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <Link to={`/admin/students/${r.studentId}`} style={{ fontWeight: 700 }}>
                        {r.studentName}
                      </Link>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.studentEmail}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>{r.targetRole}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {r.profileUrl ? (
                        <a href={r.profileUrl} target="_blank" rel="noopener noreferrer">
                          LinkedIn Profile ↗
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Uploaded as PDF/Manual</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '1rem',
                          color: r.overallScore >= 75 ? '#065f46' : r.overallScore >= 50 ? '#1e40af' : '#991b1b'
                        }}
                      >
                        {r.overallScore}/100
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {new Date(r.reviewedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <Link to={`/admin/students/${r.studentId}`} className="btn btn-outline btn-sm">
                        Inspect Review →
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

export default AdminLinkedIn;
