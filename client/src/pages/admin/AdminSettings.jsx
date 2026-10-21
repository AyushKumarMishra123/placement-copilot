import React, { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import { adminStudentAPI } from '../../services/api';
import Alert from '../../components/Alert';

const AdminSettings = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [resourceFilter, setResourceFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [healthStatus, setHealthStatus] = useState(null);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await adminStudentAPI.getAuditLogs({
        page: currentPage,
        limit: 15,
        resourceType: resourceFilter
      });
      setLogs(res.data?.data?.logs || []);
      setPagination(res.data?.data?.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 });
    } catch (err) {
      console.warn('[Audit Logs Error]', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const checkHealth = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/health');
      const data = await res.json();
      setHealthStatus(data);
    } catch (e) {
      setHealthStatus({ status: 'offline', message: 'Unable to reach API server' });
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentPage, resourceFilter]);

  useEffect(() => {
    checkHealth();
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
            Placement Cell Administration & System Audit
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', fontSize: '0.95rem' }}>
            Security telemetry, active administrative session, privacy compliance logs, and API health.
          </p>
        </div>

        <button onClick={() => { fetchLogs(); checkHealth(); }} className="btn btn-secondary btn-sm">
          🔄 Refresh Telemetry
        </button>
      </div>

      <Alert variant="danger" message={error} onClose={() => setError('')} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Active Session & Security */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
            Administrative Session
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                ADMINISTRATOR NAME
              </span>
              <div style={{ fontWeight: 600 }}>{user?.name || 'Platform Administrator'}</div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                AUTHENTICATED EMAIL
              </span>
              <div style={{ fontWeight: 600 }}>{user?.email || 'admin@placementcopilot.local'}</div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                ROLE & PRIVILEGES
              </span>
              <div style={{ marginTop: '0.2rem' }}>
                <span
                  style={{
                    background: '#fef3c7',
                    color: '#92400e',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    border: '1px solid #fde68a'
                  }}
                >
                  FULL PLACEMENT CELL ADMIN
                </span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                ADMIN AUTHORIZATION SECRET CODE
              </span>
              <div style={{ marginTop: '0.2rem' }}>
                <code
                  style={{
                    background: 'var(--bg-subtle)',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    border: '1px solid var(--border-color)',
                    display: 'inline-block'
                  }}
                >
                  msot_admin_secret_placement_copilot_2026
                </code>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Required when registering new administrative accounts.
              </div>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
            Placement Copilot Platform Health
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: healthStatus?.status === 'ok' ? '#10b981' : '#ef4444'
                }}
              />
              <span style={{ fontWeight: 700 }}>
                API Server: {healthStatus?.status === 'ok' ? 'Online & Healthy' : 'Checking / Offline'}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                DATABASE STATUS
              </span>
              <div style={{ fontWeight: 600, color: healthStatus?.database === 'connected' ? '#065f46' : 'var(--text-primary)' }}>
                {healthStatus?.database === 'connected' ? '✓ MongoDB Connected (127.0.0.1/placement_copilot)' : 'Checking...'}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                CODE EXECUTION ENGINE
              </span>
              <div style={{ fontWeight: 600 }}>
                ✓ Judge0 Online Code Execution (Parallel Multi-Worker)
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                EXTERNAL JOB AGGREGATION
              </span>
              <div style={{ fontWeight: 600 }}>
                ✓ SerpApi Google Jobs Active + Campus Placement Drives
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              Administrative Access & Privacy Audit Trail
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
              Immutable record of administrative queries to student profiles, resumes, and assessment results.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select
              className="form-select"
              value={resourceFilter}
              onChange={(e) => {
                setResourceFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: '180px', padding: '0.4rem 0.65rem', fontSize: '0.85rem' }}
            >
              <option value="">All Resource Types</option>
              <option value="overview">Overview</option>
              <option value="students">Students Directory</option>
              <option value="student_detail">Student Detail</option>
              <option value="readiness">Readiness Recalculation</option>
              <option value="resume">Resume Inspections</option>
              <option value="resume_download">Resume Downloads</option>
              <option value="linkedin">LinkedIn Reviews</option>
              <option value="interview">Interview Transcripts</option>
              <option value="coding">Coding Submissions</option>
            </select>
          </div>
        </div>

        {loadingLogs ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No audit records found matching filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Administrator</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Resource</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Action</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Target Candidate</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                      {log.adminEmail}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          background: 'var(--bg-subtle)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {log.resourceType}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-primary)' }}>
                      <code>{log.action}</code>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {log.studentEmail ? (
                        <span>{log.studentEmail}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.85rem 1.5rem',
              background: 'var(--bg-page)',
              borderTop: '1px solid var(--border-color)'
            }}
          >
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} audit events)
            </div>

            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="btn btn-secondary btn-sm"
              >
                ← Prev
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage >= pagination.totalPages}
                className="btn btn-secondary btn-sm"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;
