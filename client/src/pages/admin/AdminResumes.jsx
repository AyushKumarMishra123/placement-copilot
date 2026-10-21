import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminStudentAPI } from '../../services/api';
import Alert from '../../components/Alert';

const AdminResumes = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchResumes = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminStudentAPI.getResumesOverview();
      setResumes(res.data?.data?.resumes || []);
    } catch (err) {
      console.error('[Admin Resumes Error]', err);
      setError(err.response?.data?.message || 'Failed to load resumes overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
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
            Candidate Resumes & ATS Intelligence
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', fontSize: '0.95rem' }}>
            Inspect uploaded student resumes, verified ATS benchmark results, and download documents securely.
          </p>
        </div>

        <button onClick={fetchResumes} className="btn btn-secondary btn-sm">
          🔄 Refresh
        </button>
      </div>

      <Alert variant="danger" message={error} onClose={() => setError('')} />

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading resume records...</p>
          </div>
        ) : resumes.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No student resumes uploaded yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Document</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Candidate</th>
                  <th style={{ padding: '0.85rem 1rem' }}>ATS Benchmark Score</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status / Verdict</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Uploaded Date</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resumes.map((r) => (
                  <tr key={r.resumeId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>📄 {r.filename}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {(r.fileSize / 1024).toFixed(1)} KB • {r.fileType?.toUpperCase()}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <Link to={`/admin/students/${r.studentId}`} style={{ fontWeight: 600 }}>
                        {r.studentName}
                      </Link>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.studentEmail}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {r.overallScore !== null ? (
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: '1rem',
                            color: r.overallScore >= 75 ? '#065f46' : r.overallScore >= 50 ? '#1e40af' : '#991b1b'
                          }}
                        >
                          {r.overallScore}/100 (ATS: {r.atsScore ?? 'N/A'})
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Processing / Awaiting</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          background: 'var(--bg-subtle)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {r.verdict || 'Processed'}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {new Date(r.uploadedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <a
                        href={adminStudentAPI.getResumeDownloadUrl(r.studentId, r.resumeId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ marginRight: '0.5rem' }}
                      >
                        📥 Download
                      </a>
                      <Link to={`/admin/students/${r.studentId}`} className="btn btn-outline btn-sm">
                        Inspect
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

export default AdminResumes;
