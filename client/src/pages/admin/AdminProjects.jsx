import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminStudentAPI } from '../../services/api';
import Alert from '../../components/Alert';

const AdminProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminStudentAPI.getProjectsOverview();
      setProjects(res.data?.data?.projects || []);
    } catch (err) {
      console.error('[Admin Projects Error]', err);
      setError(err.response?.data?.message || 'Failed to load project analyses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
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
            Project & GitHub Code Audits
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', fontSize: '0.95rem' }}>
            Comprehensive repository evaluations, README documentation quality, secret detection, and live site tests.
          </p>
        </div>

        <button onClick={fetchProjects} className="btn btn-secondary btn-sm">
          🔄 Refresh
        </button>
      </div>

      <Alert variant="danger" message={error} onClose={() => setError('')} />

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading project audits...</p>
          </div>
        ) : projects.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No candidate project analyses recorded yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Project & Repository</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Candidate</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Overall Score</th>
                  <th style={{ padding: '0.85rem 1rem' }}>README</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Code Quality</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Security Alerts</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.analysisId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.projectName}</div>
                      {p.repositoryUrl && (
                        <a href={p.repositoryUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem' }}>
                          {p.repositoryUrl} ↗
                        </a>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <Link to={`/admin/students/${p.studentId}`} style={{ fontWeight: 600 }}>
                        {p.studentName}
                      </Link>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.studentEmail}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '1rem',
                          color: p.overallScore >= 75 ? '#065f46' : p.overallScore >= 50 ? '#1e40af' : '#991b1b'
                        }}
                      >
                        {p.overallScore ?? 'N/A'}/100
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>{p.readmeScore ?? 'N/A'}%</td>
                    <td style={{ padding: '0.85rem 1rem' }}>{p.codeScore ?? 'N/A'}%</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {p.secretWarnings > 0 ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991b1b', background: '#fef2f2', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #fecaca' }}>
                          ⚠️ {p.secretWarnings} Warning(s)
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#065f46', background: '#ecfdf5', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          ✓ Clean
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <Link to={`/admin/students/${p.studentId}`} className="btn btn-outline btn-sm">
                        Inspect →
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

export default AdminProjects;
