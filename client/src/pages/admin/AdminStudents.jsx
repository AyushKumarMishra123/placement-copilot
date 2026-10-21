import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminStudentAPI } from '../../services/api';
import Alert from '../../components/Alert';

const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters and search state
  const [search, setSearch] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [readinessLevel, setReadinessLevel] = useState('');
  const [assessmentStatus, setAssessmentStatus] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminStudentAPI.getStudents({
        search,
        targetRole,
        readinessLevel,
        assessmentStatus,
        page: currentPage,
        limit: 10,
        sortBy,
        sortOrder
      });

      const data = res.data?.data;
      setStudents(data?.students || []);
      setPagination(data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
    } catch (err) {
      console.error('[Admin Students Fetch Error]', err);
      setError(err.response?.data?.message || 'Failed to fetch student candidate records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, targetRole, readinessLevel, assessmentStatus, sortBy, sortOrder, currentPage]);

  const handleResetFilters = () => {
    setSearch('');
    setTargetRole('');
    setReadinessLevel('');
    setAssessmentStatus('all');
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
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
            Student Candidate Directory
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', fontSize: '0.95rem' }}>
            Inspect placement readiness profiles, resume benchmarks, code evaluations, and interview summaries.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Total <strong>{pagination.total}</strong> candidates found
          </span>
          <button onClick={fetchStudents} className="btn btn-secondary btn-sm">
            🔄 Refresh
          </button>
        </div>
      </div>

      <Alert variant="danger" message={error} onClose={() => setError('')} />

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          background: 'var(--bg-surface)'
        }}
      >
        {/* Search */}
        <div style={{ flex: '1 1 240px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            SEARCH BY NAME OR EMAIL
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="Search candidate name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            style={{ width: '100%', padding: '0.5rem 0.75rem' }}
          />
        </div>

        {/* Target Role */}
        <div style={{ flex: '1 1 180px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            TARGET ROLE
          </label>
          <select
            className="form-select"
            value={targetRole}
            onChange={(e) => {
              setTargetRole(e.target.value);
              setCurrentPage(1);
            }}
            style={{ width: '100%', padding: '0.5rem 0.75rem' }}
          >
            <option value="">All Target Roles</option>
            <option value="Software Engineer">Software Engineer</option>
            <option value="Frontend">Frontend Developer</option>
            <option value="Backend">Backend Developer</option>
            <option value="Full Stack">Full Stack Developer</option>
            <option value="Data">Data Scientist / Analyst</option>
            <option value="DevOps">DevOps / Cloud Engineer</option>
          </select>
        </div>

        {/* Readiness Level */}
        <div style={{ flex: '1 1 180px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            READINESS TIER
          </label>
          <select
            className="form-select"
            value={readinessLevel}
            onChange={(e) => {
              setReadinessLevel(e.target.value);
              setCurrentPage(1);
            }}
            style={{ width: '100%', padding: '0.5rem 0.75rem' }}
          >
            <option value="">All Readiness Tiers</option>
            <option value="Placement Ready">Placement Ready (Top / Full)</option>
            <option value="Provisional (Placement Ready)">Provisional Ready</option>
            <option value="Almost Ready">Almost Ready (50-74)</option>
            <option value="Not Ready">Not Ready (&lt;50)</option>
            <option value="Unassessed">Unassessed</option>
          </select>
        </div>

        {/* Assessment Status */}
        <div style={{ flex: '1 1 160px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            ASSESSMENT STATUS
          </label>
          <select
            className="form-select"
            value={assessmentStatus}
            onChange={(e) => {
              setAssessmentStatus(e.target.value);
              setCurrentPage(1);
            }}
            style={{ width: '100%', padding: '0.5rem 0.75rem' }}
          >
            <option value="all">All Statuses</option>
            <option value="final">Final Score (100% evaluated)</option>
            <option value="provisional">Provisional (In Progress)</option>
            <option value="unassessed">Unassessed</option>
          </select>
        </div>

        {/* Sorting */}
        <div style={{ flex: '1 1 140px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            SORT BY
          </label>
          <select
            className="form-select"
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split(':');
              setSortBy(sb);
              setSortOrder(so);
            }}
            style={{ width: '100%', padding: '0.5rem 0.75rem' }}
          >
            <option value="createdAt:desc">Joined: Newest</option>
            <option value="createdAt:asc">Joined: Oldest</option>
            <option value="readinessScore:desc">Score: Highest</option>
            <option value="readinessScore:asc">Score: Lowest</option>
            <option value="name:asc">Name: A to Z</option>
            <option value="name:desc">Name: Z to A</option>
          </select>
        </div>

        <div style={{ alignSelf: 'flex-end' }}>
          <button onClick={handleResetFilters} className="btn btn-secondary btn-sm" title="Reset all filters">
            Reset
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Filtering students...</p>
          </div>
        ) : students.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              No students match the selected criteria
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '400px', margin: '0.35rem auto 1.5rem' }}>
              Try adjusting your search query, target role, or readiness status filters to inspect candidate profiles.
            </p>
            <button onClick={handleResetFilters} className="btn btn-primary btn-sm">
              Clear All Filters
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.9rem 1rem' }}>Candidate</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Target Role</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Key Skills</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Profile</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Readiness Score</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Assessment Coverage</th>
                  <th style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const score = s.readinessScore;
                  const isFinal = s.scoreStatus === 'final';
                  const isProvisional = s.scoreStatus === 'provisional' && score !== null;

                  return (
                    <tr
                      key={s._id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-page)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Name & Email */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <Link to={`/admin/students/${s._id}`} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {s.name}
                        </Link>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          {s.email}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Joined {new Date(s.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Target Role */}
                      <td style={{ padding: '0.9rem 1rem', color: 'var(--text-secondary)' }}>
                        <div style={{ fontWeight: 600 }}>{s.targetRole || 'Not specified'}</div>
                        {s.location && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 {s.location}</div>
                        )}
                      </td>

                      {/* Skills */}
                      <td style={{ padding: '0.9rem 1rem', maxWidth: '220px' }}>
                        {s.skills && s.skills.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                            {s.skills.slice(0, 3).map((sk, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '4px',
                                  background: 'var(--bg-subtle)',
                                  color: 'var(--text-secondary)',
                                  border: '1px solid var(--border-color)'
                                }}
                              >
                                {sk}
                              </span>
                            ))}
                            {s.skills.length > 3 && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                +{s.skills.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No skills listed</span>
                        )}
                      </td>

                      {/* Profile Completion */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              flex: 1,
                              height: '6px',
                              background: 'var(--bg-subtle)',
                              borderRadius: '999px',
                              overflow: 'hidden',
                              minWidth: '50px'
                            }}
                          >
                            <div
                              style={{
                                width: `${s.profileCompletion}%`,
                                height: '100%',
                                background: s.profileCompletion >= 80 ? '#10b981' : s.profileCompletion >= 40 ? '#f59e0b' : '#ef4444'
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {s.profileCompletion}%
                          </span>
                        </div>
                      </td>

                      {/* Readiness Score */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        {score !== null ? (
                          <div>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '999px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                background:
                                  score >= 75
                                    ? isFinal
                                      ? '#ecfdf5'
                                      : '#fffbeb'
                                    : score >= 50
                                    ? '#eff6ff'
                                    : '#fef2f2',
                                color:
                                  score >= 75
                                    ? isFinal
                                      ? '#065f46'
                                      : '#92400e'
                                    : score >= 50
                                    ? '#1e40af'
                                    : '#991b1b',
                                border: `1px solid ${
                                  score >= 75
                                    ? isFinal
                                      ? '#a7f3d0'
                                      : '#fde68a'
                                    : score >= 50
                                    ? '#bfdbfe'
                                    : '#fecaca'
                                }`
                              }}
                            >
                              {score}/100 {isFinal ? '(Final)' : '(Provisional)'}
                            </span>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              {s.readinessLevel}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span
                              style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '999px',
                                fontSize: '0.74rem',
                                background: '#f1f5f9',
                                color: '#64748b'
                              }}
                            >
                              Not assessed
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Coverage % */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {s.coveragePercent}% evaluated
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {s.lastAssessmentDate
                            ? `Assessed ${new Date(s.lastAssessmentDate).toLocaleDateString()}`
                            : 'No history'}
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                        <Link
                          to={`/admin/students/${s._id}`}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '0.35rem 0.85rem' }}
                        >
                          Review Candidate →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
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
              padding: '1rem 1.5rem',
              background: 'var(--bg-page)',
              borderTop: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> (
              {pagination.total} total candidates)
            </div>

            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="btn btn-secondary btn-sm"
              >
                ← Previous
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, currentPage - 3), Math.min(pagination.totalPages, currentPage + 2))
                .map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setCurrentPage(pg)}
                    className={`btn btn-sm ${pg === currentPage ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {pg}
                  </button>
                ))}
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

export default AdminStudents;
