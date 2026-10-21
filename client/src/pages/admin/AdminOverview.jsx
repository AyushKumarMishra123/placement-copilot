import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminStudentAPI } from '../../services/api';
import Alert from '../../components/Alert';

const AdminOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOverview = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminStudentAPI.getOverview();
      setData(res.data?.data || null);
    } catch (err) {
      console.error('[Admin Overview Error]', err);
      setError(err.response?.data?.message || 'Failed to load administrative overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem', width: '2.5rem', height: '2.5rem' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading placement cell metrics from database...</p>
      </div>
    );
  }

  const summary = data?.summary || {
    totalStudents: 0,
    completedAssessmentsCount: 0,
    provisionalScoresCount: 0,
    finalScoresCount: 0,
    unassessedStudentsCount: 0,
    averageScore: null,
    publishedJobsCount: 0,
    totalApplicationsCount: 0
  };

  const readinessDist = data?.readinessDistribution || {
    'Placement Ready': 0,
    'Provisional (Placement Ready)': 0,
    'Almost Ready': 0,
    'Not Ready': 0,
    'Unassessed': 0
  };

  const applicationsByStatus = data?.applicationsByStatus || {
    Saved: 0,
    Applied: 0,
    Shortlisted: 0,
    Interview: 0,
    Offer: 0,
    Rejected: 0
  };

  const recentStudents = data?.recentStudents || [];
  const recentActivity = data?.recentActivity || [];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1.25rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Placement Cell Overview
            </h1>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                background: '#fef3c7',
                color: '#92400e',
                padding: '0.2rem 0.65rem',
                borderRadius: '999px',
                border: '1px solid #fde68a'
              }}
            >
              Live Data
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', fontSize: '0.95rem' }}>
            Authoritative batch telemetry, assessment coverage, recruitment drives, and candidate audit.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={fetchOverview} className="btn btn-secondary btn-sm" title="Refresh metrics">
            🔄 Refresh Metrics
          </button>
          <Link to="/admin/jobs/new" className="btn btn-primary btn-sm">
            ➕ Post Campus Drive
          </Link>
          <Link to="/admin/students" className="btn btn-outline btn-sm">
            👥 Manage Students
          </Link>
        </div>
      </div>

      <Alert variant="danger" message={error} onClose={() => setError('')} />

      {/* Primary KPI Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}
      >
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Registered Students
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
            {summary.totalStudents}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Active student candidate accounts
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Final Readiness Scores
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#065f46', marginTop: '0.35rem' }}>
            {summary.finalScoresCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            100% component assessment coverage
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Provisional Readiness Scores
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#92400e', marginTop: '0.35rem' }}>
            {summary.provisionalScoresCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Weighted partial assessment in progress
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #94a3b8' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Unassessed / Incomplete
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#475569', marginTop: '0.35rem' }}>
            {summary.unassessedStudentsCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            No assessment components submitted
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Average Batch Score
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0369a1', marginTop: '0.35rem' }}>
            {summary.averageScore !== null ? `${summary.averageScore}/100` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Across all evaluated students
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Active Campus Drives
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#6d28d9', marginTop: '0.35rem' }}>
            {summary.publishedJobsCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {summary.totalApplicationsCount} total student applications
          </div>
        </div>
      </div>

      {/* Distribution & Application Breakdown Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Readiness Level Breakdown */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              Batch Readiness Distribution
            </h2>
            <Link to="/admin/readiness" style={{ fontSize: '0.85rem' }}>
              View Batch Report →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {[
              { label: 'Placement Ready (Final)', count: readinessDist['Placement Ready'], color: '#10b981', bg: '#ecfdf5' },
              { label: 'Provisional (Placement Ready)', count: readinessDist['Provisional (Placement Ready)'], color: '#f59e0b', bg: '#fffbeb' },
              { label: 'Almost Ready', count: readinessDist['Almost Ready'], color: '#3b82f6', bg: '#eff6ff' },
              { label: 'Not Ready', count: readinessDist['Not Ready'], color: '#ef4444', bg: '#fef2f2' },
              { label: 'Unassessed / Incomplete', count: readinessDist['Unassessed'], color: '#94a3b8', bg: '#f8fafc' }
            ].map((item, idx) => {
              const pct = summary.totalStudents > 0 ? Math.round((item.count / summary.totalStudents) * 100) : 0;
              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>{item.label}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <strong>{item.count}</strong> students ({pct}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: '8px',
                      background: 'var(--bg-subtle)',
                      borderRadius: '999px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: item.color,
                        borderRadius: '999px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Application Status Pipeline */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              Campus Drive Applicant Pipeline
            </h2>
            <Link to="/admin/jobs" style={{ fontSize: '0.85rem' }}>
              Manage Drives →
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.85rem',
              marginBottom: '1rem'
            }}
          >
            {[
              { status: 'Applied', count: applicationsByStatus.Applied, color: '#3b82f6', bg: '#eff6ff' },
              { status: 'Shortlisted', count: applicationsByStatus.Shortlisted, color: '#10b981', bg: '#ecfdf5' },
              { status: 'Interview', count: applicationsByStatus.Interview, color: '#8b5cf6', bg: '#f5f3ff' },
              { status: 'Offer', count: applicationsByStatus.Offer, color: '#059669', bg: '#d1fae5' },
              { status: 'Rejected', count: applicationsByStatus.Rejected, color: '#ef4444', bg: '#fef2f2' },
              { status: 'Saved / Pending', count: applicationsByStatus.Saved, color: '#64748b', bg: '#f1f5f9' }
            ].map((st, i) => (
              <div
                key={i}
                style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: st.bg,
                  border: `1px solid ${st.color}20`,
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: st.color }}>
                  {st.count}
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {st.status}
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Total {summary.totalApplicationsCount} candidate applications tracked across {summary.publishedJobsCount} active campus opportunities.
          </div>
        </div>
      </div>

      {/* Recent Students & Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
        {/* Recent Students Table */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              Recent Student Registrations
            </h2>
            <Link to="/admin/students" style={{ fontSize: '0.85rem' }}>
              View All Students ({summary.totalStudents}) →
            </Link>
          </div>

          {recentStudents.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No students registered in the database yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Student</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Target Role</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Readiness</th>
                    <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentStudents.map((s) => (
                    <tr key={s._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.email}</div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                        {s.targetRole}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {s.readinessScore !== null ? (
                          <span
                            style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: s.readinessScore >= 75 ? '#ecfdf5' : s.readinessScore >= 50 ? '#eff6ff' : '#fef2f2',
                              color: s.readinessScore >= 75 ? '#065f46' : s.readinessScore >= 50 ? '#1e40af' : '#991b1b'
                            }}
                          >
                            {s.readinessScore}/100 ({s.scoreStatus === 'final' ? 'Final' : 'Provisional'})
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Not assessed</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <Link
                          to={`/admin/students/${s._id}`}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Live Activity Stream */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              Recent Assessment Activity
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Real database events</span>
          </div>

          {recentActivity.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No recent assessment activity recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {recentActivity.map((act, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-page)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background:
                        act.type === 'readiness'
                          ? '#ecfdf5'
                          : act.type === 'resume'
                          ? '#eff6ff'
                          : act.type === 'interview'
                          ? '#f5f3ff'
                          : '#fffbeb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      flexShrink: 0
                    }}
                  >
                    {act.type === 'readiness' ? '📊' : act.type === 'resume' ? '📄' : act.type === 'interview' ? '🎙️' : '💻'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {act.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      <Link to={`/admin/students/${act.studentId}`} style={{ fontWeight: 600 }}>
                        {act.studentName}
                      </Link>{' '}
                      ({act.studentEmail})
                    </div>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                    {act.timestamp ? new Date(act.timestamp).toLocaleDateString() : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
