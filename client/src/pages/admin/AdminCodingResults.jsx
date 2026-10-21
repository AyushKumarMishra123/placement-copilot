import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminStudentAPI } from '../../services/api';
import Alert from '../../components/Alert';

const AdminCodingResults = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCoding = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminStudentAPI.getCodingOverview();
      setSubmissions(res.data?.data?.submissions || []);
    } catch (err) {
      console.error('[Admin Coding Results Error]', err);
      setError(err.response?.data?.message || 'Failed to load coding submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoding();
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
            Coding Assessment Outcomes & DSA Practice
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', fontSize: '0.95rem' }}>
            Audit candidate code executions, test case results, runtime performance, and solution outcomes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={fetchCoding} className="btn btn-secondary btn-sm">
            🔄 Refresh
          </button>
          <Link to="/admin/coding" className="btn btn-primary btn-sm">
            ⚙️ Question Bank & Test Cases
          </Link>
        </div>
      </div>

      <Alert variant="danger" message={error} onClose={() => setError('')} />

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading coding submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No coding problem submissions on file yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Problem</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Candidate</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Difficulty</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Language</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Test Cases</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Score</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.submissionId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>
                      {s.problemTitle}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <Link to={`/admin/students/${s.studentId}`} style={{ fontWeight: 600 }}>
                        {s.studentName}
                      </Link>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.studentEmail}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          background:
                            s.difficulty === 'Easy'
                              ? '#ecfdf5'
                              : s.difficulty === 'Hard'
                              ? '#fef2f2'
                              : '#fffbeb',
                          color:
                            s.difficulty === 'Easy'
                              ? '#065f46'
                              : s.difficulty === 'Hard'
                              ? '#991b1b'
                              : '#92400e'
                        }}
                      >
                        {s.difficulty}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textTransform: 'capitalize' }}>{s.language}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: s.status === 'Accepted' ? '#10b981' : '#ef4444'
                        }}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {s.passedTestCases} / {s.totalTestCases}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 800 }}>{s.score} pts</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {new Date(s.submittedAt).toLocaleDateString()}
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

export default AdminCodingResults;
