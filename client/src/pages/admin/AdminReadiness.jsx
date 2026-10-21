import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminStudentAPI } from '../../services/api';
import Alert from '../../components/Alert';

const AdminReadiness = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterTier, setFilterTier] = useState('');

  const fetchReadiness = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminStudentAPI.getReadinessOverview();
      setRecords(res.data?.data?.records || []);
    } catch (err) {
      console.error('[Admin Readiness Error]', err);
      setError(err.response?.data?.message || 'Failed to load readiness overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadiness();
  }, []);

  const filteredRecords = filterTier
    ? records.filter((r) => r.readinessLevel.toLowerCase().includes(filterTier.toLowerCase()))
    : records;

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
            Batch Placement Readiness Report
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', fontSize: '0.95rem' }}>
            Authoritative readiness evaluation across all candidates computed via the single-source weighted engine.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select
            className="form-select"
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            style={{ width: '200px' }}
          >
            <option value="">All Readiness Tiers</option>
            <option value="Placement Ready">Placement Ready</option>
            <option value="Almost Ready">Almost Ready</option>
            <option value="Not Ready">Not Ready</option>
            <option value="Unassessed">Unassessed</option>
          </select>
          <button onClick={fetchReadiness} className="btn btn-secondary btn-sm">
            🔄 Refresh
          </button>
        </div>
      </div>

      <Alert variant="danger" message={error} onClose={() => setError('')} />

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Compiling batch readiness reports...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No candidate readiness records found matching filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Candidate</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Target Role</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Readiness Score</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Tier & Status</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Coverage</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Last Calculated</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r) => (
                  <tr key={r.studentId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <Link to={`/admin/students/${r.studentId}`} style={{ fontWeight: 700 }}>
                        {r.name}
                      </Link>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.email}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>{r.targetRole}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {r.score !== null ? (
                        <span style={{ fontSize: '1.15rem', fontWeight: 800, color: r.score >= 75 ? '#065f46' : r.score >= 50 ? '#1e40af' : '#991b1b' }}>
                          {r.score}/100
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Not assessed</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          background: r.score >= 75 ? '#ecfdf5' : r.score >= 50 ? '#eff6ff' : '#fef2f2',
                          color: r.score >= 75 ? '#065f46' : r.score >= 50 ? '#1e40af' : '#991b1b'
                        }}
                      >
                        {r.readinessLevel} ({r.scoreStatus === 'final' ? 'Final' : 'Provisional'})
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>{r.coveragePercent}% evaluated</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {r.lastUpdated ? new Date(r.lastUpdated).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <Link to={`/admin/students/${r.studentId}`} className="btn btn-outline btn-sm">
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

export default AdminReadiness;
