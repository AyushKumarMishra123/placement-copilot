import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminStudentAPI } from '../../services/api';
import Alert from '../../components/Alert';

const AdminStudentDetail = () => {
  const { studentId } = useParams();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'readiness', 'resumes', 'linkedin', 'projects', 'interviews', 'coding'
  const [studentData, setStudentData] = useState(null);
  const [readinessData, setReadinessData] = useState(null);
  const [resumesData, setResumesData] = useState([]);
  const [linkedinData, setLinkedinData] = useState(null);
  const [projectsData, setProjectsData] = useState(null);
  const [interviewsData, setInterviewsData] = useState([]);
  const [codingData, setCodingData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedTranscript, setSelectedTranscript] = useState(null);

  // Initial load: student core data and readiness
  const fetchStudentBase = async () => {
    setLoading(true);
    setError('');
    try {
      const [resStudent, resReadiness] = await Promise.all([
        adminStudentAPI.getStudentById(studentId),
        adminStudentAPI.getReadiness(studentId)
      ]);

      setStudentData(resStudent.data?.data || null);
      setReadinessData(resReadiness.data?.data?.assessment || null);
    } catch (err) {
      console.error('[Admin Student Detail Error]', err);
      setError(err.response?.data?.message || 'Failed to load student record');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentBase();
  }, [studentId]);

  // Lazy load tab data when a specific tab is opened
  useEffect(() => {
    if (!studentId) return;

    if (activeTab === 'resumes' && resumesData.length === 0) {
      adminStudentAPI.getResumes(studentId).then((res) => {
        setResumesData(res.data?.data?.resumes || []);
      }).catch((e) => console.warn('[Fetch Resumes]', e));
    } else if (activeTab === 'linkedin' && !linkedinData) {
      adminStudentAPI.getLinkedInReviews(studentId).then((res) => {
        setLinkedinData(res.data?.data || null);
      }).catch((e) => console.warn('[Fetch LinkedIn]', e));
    } else if (activeTab === 'projects' && !projectsData) {
      adminStudentAPI.getProjects(studentId).then((res) => {
        setProjectsData(res.data?.data || null);
      }).catch((e) => console.warn('[Fetch Projects]', e));
    } else if (activeTab === 'interviews' && interviewsData.length === 0) {
      adminStudentAPI.getInterviews(studentId).then((res) => {
        setInterviewsData(res.data?.data?.interviews || []);
      }).catch((e) => console.warn('[Fetch Interviews]', e));
    } else if (activeTab === 'coding' && codingData.length === 0) {
      adminStudentAPI.getCodingAssessments(studentId).then((res) => {
        setCodingData(res.data?.data?.submissions || []);
      }).catch((e) => console.warn('[Fetch Coding]', e));
    }
  }, [activeTab, studentId]);

  // Authoritative readiness recalculation action
  const handleRecalculateReadiness = async () => {
    setRecalculating(true);
    setSuccessMsg('');
    setError('');
    try {
      const res = await adminStudentAPI.refreshReadiness(studentId);
      const updated = res.data?.data?.assessment;
      setReadinessData(updated);
      setSuccessMsg(`Authoritative readiness successfully recalculated: Score ${updated.score !== null ? `${updated.score}/100` : 'Unassessed'} (${updated.readinessLevel}).`);
    } catch (err) {
      console.error('[Recalculate Error]', err);
      setError(err.response?.data?.message || 'Failed to recalculate readiness');
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem', width: '2.5rem', height: '2.5rem' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading student candidate profile and assessments...</p>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <h2>Candidate Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          No student record was found matching identifier "{studentId}".
        </p>
        <Link to="/admin/students" className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>
          ← Return to Student Directory
        </Link>
      </div>
    );
  }

  const { student, profile, profileCompletion, counts } = studentData;
  const readiness = readinessData;
  const isFinal = readiness?.scoreStatus === 'final';
  const isProvisional = readiness?.scoreStatus === 'provisional' && readiness?.score !== null;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ marginBottom: '1rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
        <Link to="/admin/overview">Admin Portal</Link> /{' '}
        <Link to="/admin/students">Students</Link> /{' '}
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{student.name}</span>
      </div>

      {/* Candidate Header Profile Banner */}
      <div
        className="card"
        style={{
          padding: '1.75rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          borderLeft: '5px solid var(--primary)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: '#ffffff',
              fontSize: '1.75rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)'
            }}
          >
            {student.name.charAt(0).toUpperCase()}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {student.name}
              </h1>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px',
                  background:
                    readiness?.score >= 75
                      ? isFinal
                        ? '#ecfdf5'
                        : '#fffbeb'
                      : readiness?.score >= 50
                      ? '#eff6ff'
                      : readiness?.score !== null
                      ? '#fef2f2'
                      : '#f1f5f9',
                  color:
                    readiness?.score >= 75
                      ? isFinal
                        ? '#065f46'
                        : '#92400e'
                      : readiness?.score >= 50
                      ? '#1e40af'
                      : readiness?.score !== null
                      ? '#991b1b'
                      : '#64748b',
                  border: '1px solid currentColor'
                }}
              >
                {readiness?.score !== null
                  ? `Readiness: ${readiness?.score}/100 (${isFinal ? 'Final' : 'Provisional'})`
                  : 'Not assessed'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.35rem', fontSize: '0.88rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <span>📧 {student.email}</span>
              {profile?.targetRole && <span>🎯 {profile.targetRole}</span>}
              {profile?.location && <span>📍 {profile.location}</span>}
              <span>📅 Joined {new Date(student.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleRecalculateReadiness}
            disabled={recalculating}
            className="btn btn-secondary btn-sm"
            title="Recalculates authoritative readiness based on actual assessments"
          >
            {recalculating ? 'Recalculating...' : '🔄 Recalculate Readiness'}
          </button>
          <Link to="/admin/students" className="btn btn-outline btn-sm">
            ← Directory
          </Link>
        </div>
      </div>

      <Alert variant="danger" message={error} onClose={() => setError('')} />
      {successMsg && <Alert variant="success" message={successMsg} onClose={() => setSuccessMsg('')} />}

      {/* Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid var(--border-color)',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          gap: '0.5rem'
        }}
      >
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'readiness', label: 'Readiness Breakdown (7 Components)' },
          { key: 'resumes', label: `Resumes (${counts.resumes})` },
          { key: 'linkedin', label: 'LinkedIn Review' },
          { key: 'projects', label: `Projects & GitHub (${counts.projects})` },
          { key: 'interviews', label: `Mock Interviews (${counts.interviews})` },
          { key: 'coding', label: `Coding Practice (${counts.coding})` }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.75rem 1.15rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: 'none',
              background: 'transparent',
              color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.key ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          {/* Profile Card */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>Candidate Profile Information</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem', fontWeight: 700 }}>
                  TARGET CAREER ROLE
                </span>
                <span style={{ fontWeight: 600 }}>{profile?.targetRole || 'Not specified by candidate'}</span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem', fontWeight: 700 }}>
                  EDUCATION
                </span>
                <span>{profile?.education || 'Not provided'}</span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem', fontWeight: 700 }}>
                  TECHNICAL SKILLS
                </span>
                {profile?.skills && profile.skills.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                    {profile.skills.map((sk, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '0.8rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          background: 'var(--bg-subtle)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>No skills populated</span>
                )}
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem', fontWeight: 700 }}>
                  EXTERNAL PORTFOLIO & REPOSITORIES
                </span>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  {profile?.github ? (
                    <a href={profile.github} target="_blank" rel="noopener noreferrer">
                      🐙 GitHub Profile ↗
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No GitHub URL</span>
                  )}
                  {profile?.linkedin ? (
                    <a href={profile.linkedin} target="_blank" rel="noopener noreferrer">
                      💼 LinkedIn Profile ↗
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No LinkedIn URL</span>
                  )}
                  {profile?.leetcode && (
                    <a href={profile.leetcode} target="_blank" rel="noopener noreferrer">
                      ⚡ LeetCode Profile ↗
                    </a>
                  )}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem', fontWeight: 700 }}>
                  PROFILE COMPLETION STATUS
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <div style={{ flex: 1, height: '8px', background: 'var(--bg-subtle)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${profileCompletion}%`,
                        height: '100%',
                        background: profileCompletion >= 80 ? '#10b981' : profileCompletion >= 40 ? '#f59e0b' : '#ef4444'
                      }}
                    />
                  </div>
                  <span style={{ fontWeight: 700 }}>{profileCompletion}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Placement Readiness Summary Card */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>Placement Readiness Summary</h3>

            {readiness?.score !== null ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '2.75rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {readiness?.score}
                  </span>
                  <span style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>/ 100</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      color: isFinal ? '#065f46' : '#92400e'
                    }}
                  >
                    {isFinal ? 'Final Certified Score' : 'Provisional Score'}
                  </span>
                </div>

                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                  Tier: {readiness?.readinessLevel}
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                    <span>Assessment Coverage</span>
                    <span><strong>{readiness?.coveragePercent}%</strong> of weighted components evaluated</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-subtle)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${readiness?.coveragePercent}%`, height: '100%', background: '#3b82f6' }} />
                  </div>
                </div>

                <button onClick={() => setActiveTab('readiness')} className="btn btn-outline btn-sm" style={{ width: '100%' }}>
                  Inspect Full 7-Component Breakdown →
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  This student has not yet completed any evaluated readiness assessments.
                </p>
                <button
                  onClick={handleRecalculateReadiness}
                  disabled={recalculating}
                  className="btn btn-primary btn-sm"
                >
                  {recalculating ? 'Checking Sources...' : 'Check & Calculate Initial Readiness'}
                </button>
              </div>
            )}

            {/* Assessment Artifact Counts */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-color)',
                textAlign: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>{counts.resumes}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Resumes</div>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>{counts.interviews}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Interviews</div>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>{counts.coding}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Coding Submissions</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: READINESS BREAKDOWN */}
      {activeTab === 'readiness' && (
        <div>
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  Official 7-Component Readiness Breakdown
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Authoritative engine evaluation calculated from verified student artifacts using single-source weights.
                </p>
              </div>

              <button
                onClick={handleRecalculateReadiness}
                disabled={recalculating}
                className="btn btn-primary btn-sm"
              >
                {recalculating ? 'Recalculating...' : '🔄 Refresh Assessment'}
              </button>
            </div>

            {readiness?.components && readiness.components.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {readiness.components.map((c) => {
                  const isAssessed = c.status === 'assessed' && c.score !== null;

                  return (
                    <div
                      key={c.key}
                      style={{
                        padding: '1rem 1.25rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-page)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '0.98rem' }}>{c.label}</span>
                          <span
                            style={{
                              marginLeft: '0.5rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: 'var(--bg-subtle)',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            Weight: {c.weight}%
                          </span>
                        </div>

                        <div>
                          {isAssessed ? (
                            <span
                              style={{
                                fontSize: '0.95rem',
                                fontWeight: 800,
                                color: c.score >= 75 ? '#065f46' : c.score >= 50 ? '#1e40af' : '#991b1b'
                              }}
                            >
                              Score: {c.score}/100
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                padding: '0.2rem 0.5rem',
                                borderRadius: '999px',
                                background: '#f1f5f9',
                                color: '#64748b'
                              }}
                            >
                              Not assessed
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Reasons / Findings */}
                      {c.reasons && c.reasons.length > 0 ? (
                        <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {c.reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {isAssessed ? 'No specific warnings flagged.' : 'Awaiting candidate completion.'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No component evaluations available.</p>
            )}
          </div>

          {/* Actionable Recommendations */}
          {readiness?.recommendations && readiness.recommendations.length > 0 && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
                Prioritized Action Items for Candidate Improvement
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {readiness.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-page)',
                      borderLeft: `4px solid ${rec.priority === 'high' ? '#ef4444' : rec.priority === 'medium' ? '#f59e0b' : '#3b82f6'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.9rem' }}>
                      <span>{rec.title}</span>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        {rec.sourceComponent} • {rec.priority} Priority
                      </span>
                    </div>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0' }}>
                      {rec.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RESUMES */}
      {activeTab === 'resumes' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              Uploaded Candidate Resumes & ATS Benchmarks
            </h3>
          </div>

          {resumesData.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No resumes uploaded by this student yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {resumesData.map((resDoc) => (
                <div
                  key={resDoc._id}
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-page)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        📄 {resDoc.originalFilename}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Uploaded {new Date(resDoc.createdAt).toLocaleString()} • Size: {(resDoc.fileSize / 1024).toFixed(1)} KB • Type: {resDoc.fileType?.toUpperCase()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <a
                        href={adminStudentAPI.getResumeDownloadUrl(studentId, resDoc._id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-sm"
                      >
                        📥 Secure Download / View PDF
                      </a>
                    </div>
                  </div>

                  {/* Associated Reviews */}
                  {resDoc.reviews && resDoc.reviews.length > 0 ? (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        Authoritative Review & Benchmark Results
                      </div>
                      {resDoc.reviews.map((rev) => (
                        <div
                          key={rev._id}
                          style={{
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-color)',
                            marginBottom: '0.5rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                              Overall Score: <strong>{rev.scores?.overallScore ?? 'N/A'}/100</strong> (ATS: {rev.scores?.atsScore ?? 'N/A'})
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Evaluated {new Date(rev.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          {rev.findings && rev.findings.length > 0 && (
                            <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.25rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              {rev.findings.slice(0, 4).map((f, i) => (
                                <li key={i}>{f.message || f.explanation || f.title}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      No benchmark review records stored for this document.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: LINKEDIN */}
      {activeTab === 'linkedin' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
            LinkedIn Profile Analysis
          </h3>

          <div style={{ marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>SUBMITTED LINKEDIN URL: </span>
            {linkedinData?.profileUrl ? (
              <a href={linkedinData.profileUrl} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>
                {linkedinData.profileUrl} ↗
              </a>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>No LinkedIn URL submitted by student</span>
            )}
          </div>

          {!linkedinData?.reviews || linkedinData.reviews.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>ℹ️</div>
              <h4 style={{ fontWeight: 700 }}>Review not available</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
                The candidate has not yet initiated or submitted a LinkedIn profile review.
              </p>
              {linkedinData?.profileUrl && (
                <a
                  href={linkedinData.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '0.75rem' }}
                >
                  Visit Profile on LinkedIn ↗
                </a>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {linkedinData.reviews.map((rev) => (
                <div key={rev._id} style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-page)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                      Profile Review Score: {rev.overallScore}/100
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Analyzed on {new Date(rev.reviewedAt || rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {rev.categoryScores && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                      {Object.entries(rev.categoryScores).map(([cat, scoreObj]) => (
                        <div key={cat} style={{ padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{cat}</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {scoreObj.score}/{scoreObj.max}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {rev.strengths && rev.strengths.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#065f46' }}>Strengths:</strong>
                      <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                        {rev.strengths.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {rev.weaknesses && rev.weaknesses.length > 0 && (
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: '#991b1b' }}>Improvement Areas:</strong>
                      <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                        {rev.weaknesses.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: PROJECTS & GITHUB */}
      {activeTab === 'projects' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
            GitHub Repositories & Deep Project Audits
          </h3>

          {!projectsData?.analyses || projectsData.analyses.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No automated repository audits recorded for this student.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {projectsData.analyses.map((p) => (
                <div
                  key={p._id}
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-page)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h4 style={{ fontWeight: 800, fontSize: '1.05rem', margin: 0 }}>
                        {p.projectName}
                      </h4>
                      {p.repositoryUrl && (
                        <a href={p.repositoryUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.82rem' }}>
                          {p.repositoryUrl} ↗
                        </a>
                      )}
                    </div>

                    <span
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '999px',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        background: p.scores?.overallProjectScore >= 75 ? '#ecfdf5' : '#eff6ff',
                        color: p.scores?.overallProjectScore >= 75 ? '#065f46' : '#1e40af'
                      }}
                    >
                      Project Score: {p.scores?.overallProjectScore ?? 'N/A'}/100
                    </span>
                  </div>

                  {/* Secret Findings / Warnings */}
                  {p.secretFindings && p.secretFindings.length > 0 && (
                    <div
                      style={{
                        padding: '0.75rem',
                        borderRadius: '6px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        marginBottom: '0.75rem',
                        fontSize: '0.85rem',
                        color: '#991b1b'
                      }}
                    >
                      ⚠️ <strong>Security Notice:</strong> {p.secretFindings.length} potential secret(s) or sensitive credential patterns detected in repository.
                    </div>
                  )}

                  {/* Quality Breakdown */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <div style={{ padding: '0.5rem', background: 'var(--bg-surface)', borderRadius: '4px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>README Quality</div>
                      <div style={{ fontWeight: 700 }}>{p.scores?.readmeQuality ?? 'N/A'}%</div>
                    </div>
                    <div style={{ padding: '0.5rem', background: 'var(--bg-surface)', borderRadius: '4px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Code Quality</div>
                      <div style={{ fontWeight: 700 }}>{p.scores?.codeQuality ?? 'N/A'}%</div>
                    </div>
                    <div style={{ padding: '0.5rem', background: 'var(--bg-surface)', borderRadius: '4px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Live URL Status</div>
                      <div style={{ fontWeight: 700 }}>{p.liveCheck?.claimVerification?.status || 'Not checked'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: MOCK INTERVIEWS */}
      {activeTab === 'interviews' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
            Completed Mock Interview Evaluations
          </h3>

          {interviewsData.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No completed mock interview sessions on file for this candidate.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {interviewsData.map((iv) => (
                <div
                  key={iv._id}
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-page)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h4 style={{ fontWeight: 800, fontSize: '1.05rem', margin: 0 }}>
                        Target Role: {iv.targetRole}
                      </h4>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Conducted {new Date(iv.completedAt || iv.createdAt).toLocaleString()} • Duration: {iv.durationMinutes} minutes • Status: {iv.status}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '999px',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          background: iv.evaluation?.overallScore >= 75 ? '#ecfdf5' : '#eff6ff',
                          color: iv.evaluation?.overallScore >= 75 ? '#065f46' : '#1e40af'
                        }}
                      >
                        Score: {iv.evaluation?.overallScore ?? 'N/A'}/100
                      </span>

                      {iv.transcript && iv.transcript.length > 0 && (
                        <button
                          onClick={() => setSelectedTranscript(selectedTranscript === iv._id ? null : iv._id)}
                          className="btn btn-outline btn-sm"
                        >
                          {selectedTranscript === iv._id ? 'Hide Transcript' : 'View Transcript'}
                        </button>
                      )}
                    </div>
                  </div>

                  {iv.evaluation?.dimensions && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      {iv.evaluation.dimensions.map((dim, i) => (
                        <div key={i} style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-surface)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{dim.name}</div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{dim.score}/100</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {iv.evaluation?.strengths && iv.evaluation.strengths.length > 0 && (
                    <div style={{ fontSize: '0.85rem', color: '#065f46', marginBottom: '0.35rem' }}>
                      <strong>Strengths:</strong> {iv.evaluation.strengths.join(' • ')}
                    </div>
                  )}

                  {iv.evaluation?.weaknesses && iv.evaluation.weaknesses.length > 0 && (
                    <div style={{ fontSize: '0.85rem', color: '#991b1b', marginBottom: '0.35rem' }}>
                      <strong>Improvement Areas:</strong> {iv.evaluation.weaknesses.join(' • ')}
                    </div>
                  )}

                  {/* Transcript Viewer Dropdown */}
                  {selectedTranscript === iv._id && iv.transcript && (
                    <div
                      style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        borderRadius: 'var(--radius-sm)',
                        background: '#0f172a',
                        color: '#f8fafc',
                        fontSize: '0.84rem',
                        maxHeight: '400px',
                        overflowY: 'auto'
                      }}
                    >
                      <h5 style={{ color: '#93c5fd', marginBottom: '0.75rem' }}>Authorized Interview Transcript</h5>
                      {iv.transcript.map((t, idx) => (
                        <div key={idx} style={{ marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                          <div style={{ fontWeight: 700, color: '#38bdf8' }}>
                            Q{idx + 1} ({t.category}): {t.questionText}
                          </div>
                          <div style={{ marginTop: '0.25rem', color: '#cbd5e1' }}>
                            {t.skipped ? 'Candidate skipped this question.' : t.answerText || 'No answer recorded.'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: CODING PRACTICE */}
      {activeTab === 'coding' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
            DSA Practice & Coding Assessments
          </h3>

          {codingData.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Not assessed: No coding problem submissions recorded yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>Problem</th>
                    <th style={{ padding: '0.75rem' }}>Difficulty</th>
                    <th style={{ padding: '0.75rem' }}>Language</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem' }}>Test Cases</th>
                    <th style={{ padding: '0.75rem' }}>Score</th>
                    <th style={{ padding: '0.75rem' }}>Submitted At</th>
                  </tr>
                </thead>
                <tbody>
                  {codingData.map((sub) => (
                    <tr key={sub._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 700 }}>
                        {sub.problemId?.title || 'Coding Problem'}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            background:
                              sub.problemId?.difficulty === 'Easy'
                                ? '#ecfdf5'
                                : sub.problemId?.difficulty === 'Hard'
                                ? '#fef2f2'
                                : '#fffbeb',
                            color:
                              sub.problemId?.difficulty === 'Easy'
                                ? '#065f46'
                                : sub.problemId?.difficulty === 'Hard'
                                ? '#991b1b'
                                : '#92400e'
                          }}
                        >
                          {sub.problemId?.difficulty || 'Medium'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>{sub.language}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: sub.status === 'Accepted' ? '#10b981' : '#ef4444'
                          }}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {sub.passedTestCases} / {sub.totalTestCases} passed
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 800 }}>{sub.score} pts</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(sub.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminStudentDetail;
