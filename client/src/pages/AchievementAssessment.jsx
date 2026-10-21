import React, { useState, useEffect } from 'react';
import { achievementAPI, profileAPI } from '../services/api';
import Alert from '../components/Alert';

const CATEGORIES = [
  {
    key: 'hackathons',
    title: 'Hackathons & Technical Competitions',
    icon: '🏆',
    description: 'Hackathons, coding contests, algorithmic showdowns, ideathons',
    sampleResult: '1st Place, Finalist, Top 10, Participant'
  },
  {
    key: 'leadership',
    title: 'Leadership & College Clubs',
    icon: '👥',
    description: 'Student chapters (GDG, ACM, IEEE), departmental societies, event heads',
    sampleResult: 'President, Vice Lead, Technical Head, Event Coordinator'
  },
  {
    key: 'open_source',
    title: 'Open-Source Contributions',
    icon: '🌐',
    description: 'GitHub repositories, Google Summer of Code, Hacktoberfest, public PRs',
    sampleResult: 'Merged PR, Contributor, Feature Implementation'
  },
  {
    key: 'projects',
    title: 'Projects, Exhibitions & Innovation',
    icon: '🚀',
    description: 'Project showcases, science fairs, patents, startup incubations',
    sampleResult: 'Best Innovation Award, Exhibited, Published Prototype'
  },
  {
    key: 'certifications',
    title: 'Certifications & Technical Workshops',
    icon: '📜',
    description: 'Cloud certs (AWS/GCP/Azure), bootcamp diplomas, technical masterclasses',
    sampleResult: 'AWS Certified Solutions Architect, Certified Associate'
  },
  {
    key: 'extracurricular',
    title: 'Volunteering, Sports & Cultural Activities',
    icon: '🎖️',
    description: 'NSS, NGO volunteering, inter-college sports, cultural festival organizers',
    sampleResult: 'Lead Volunteer, Team Captain, Award of Merit'
  }
];

const emptyAchievement = (cat) => ({
  category: cat,
  title: '',
  organizer: '',
  date: '',
  participationType: 'individual',
  role: '',
  teamSize: 1,
  resultAward: '',
  problemSolved: '',
  contribution: '',
  technologies: '',
  impact: '',
  evidenceUrl: '',
  status: 'completed'
});

const AchievementAssessment = () => {
  const [participationStatus, setParticipationStatus] = useState('achievements');
  // 'achievements' | 'activities_no_formal' | 'none_want_to_improve'
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [academicYear, setAcademicYear] = useState('3rd Year');
  const [achievements, setAchievements] = useState([]);
  const [activeCategoryTab, setActiveCategoryTab] = useState('hackathons');

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [assessment, setAssessment] = useState(null);
  const [history, setHistory] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setInitialLoading(true);
    try {
      const [profileRes, latestRes, historyRes] = await Promise.allSettled([
        profileAPI.get(),
        achievementAPI.getLatest(),
        achievementAPI.getHistory()
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.data.data?.profile) {
        const p = profileRes.value.data.data.profile;
        if (p.targetRole) setTargetRole(p.targetRole);
      }

      if (latestRes.status === 'fulfilled' && latestRes.value.data.data?.assessment) {
        const ass = latestRes.value.data.data.assessment;
        setAssessment(ass);
        setParticipationStatus(ass.participationStatus);
        setTargetRole(ass.targetRole || 'Software Engineer');
        setAcademicYear(ass.academicYear || '3rd Year');
        if (ass.achievements && ass.achievements.length > 0) {
          setAchievements(
            ass.achievements.map((a) => ({
              ...a,
              technologies: Array.isArray(a.technologies) ? a.technologies.join(', ') : a.technologies || ''
            }))
          );
        }
      }

      if (historyRes.status === 'fulfilled' && historyRes.value.data.data?.history) {
        setHistory(historyRes.value.data.data.history);
      }
    } catch (err) {
      console.warn('[Achievement Load Note]', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleAddAchievement = (categoryKey) => {
    setAchievements((prev) => [...prev, emptyAchievement(categoryKey)]);
    setActiveCategoryTab(categoryKey);
  };

  const handleUpdateAchievement = (index, field, value) => {
    setAchievements((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveAchievement = (index) => {
    setAchievements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitAssessment = async (e) => {
    if (e) e.preventDefault();
    setError('');

    // If candidate selected they have achievements, validate that at least one achievement is entered
    if (participationStatus === 'achievements') {
      const valid = achievements.filter((a) => a.title && a.title.trim().length > 1);
      if (valid.length === 0) {
        setError(
          'You selected "Yes, I have achievements to report". Please add at least 1 achievement title or select "I have participated in activities but have no formal achievements yet" / "Not yet, but I want to improve my profile".'
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        participationStatus,
        targetRole,
        academicYear,
        achievements:
          participationStatus === 'none_want_to_improve'
            ? []
            : achievements
                .filter((a) => a.title && a.title.trim().length > 0)
                .map((a) => ({
                  ...a,
                  technologies: typeof a.technologies === 'string'
                    ? a.technologies.split(',').map((t) => t.trim()).filter(Boolean)
                    : a.technologies
                }))
      };

      const res = await achievementAPI.assess(payload);
      const newAssessment = res.data.data.assessment;
      setAssessment(newAssessment);
      setIsEditing(false);
      setHistory((prev) => [newAssessment, ...prev.filter((h) => h._id !== newAssessment._id)]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit achievement assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'var(--success)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  if (initialLoading) {
    return (
      <div className="page-container" style={{ padding: '2rem 1rem', maxWidth: '1080px', margin: '0 auto' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading Co-Curricular Assessment...</p>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '2rem 1rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Placement Readiness Module
          </span>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>6-Dimension Weighted Rubric (100%)</span>
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Co-Curricular Achievement Assessment
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '780px', fontSize: '0.95rem', lineHeight: '1.6' }}>
          Evaluate your technical hackathons, open source contributions, club leadership, and certifications. We score your actual contributions, verifiability, and relevance to your target role to generate an actionable 30-day and 60-day achievement roadmap.
        </p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* When assessment exists and not in editing mode, display rich results */}
      {assessment && !isEditing ? (
        <div>
          {/* Top Overall Score Card */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
              color: '#fff',
              padding: '2rem',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '2rem',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1.5rem',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div>
              <span style={{ fontSize: '0.85rem', letterSpacing: '0.05em', color: '#a7f3d0', fontWeight: 700, textTransform: 'uppercase' }}>
                {assessment.baseline ? 'Baseline Starter Assessment' : 'Verified Co-Curricular Score'} • {new Date(assessment.assessedAt || assessment.createdAt).toLocaleDateString()}
              </span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.4rem 0' }}>
                Co-Curricular Achievement Score
              </h2>
              <p style={{ color: '#d1fae5', fontSize: '0.92rem', maxWidth: '540px', margin: 0 }}>
                Target Role: <strong>{assessment.targetRole}</strong> ({assessment.academicYear}). Calculated from {assessment.achievements?.length || 0} activity record(s) across 6 weighted dimensions.
              </p>
            </div>

            <div style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.12)', padding: '1.25rem 2rem', borderRadius: 'var(--radius-md)', backdropFilter: 'blur(8px)', minWidth: '160px' }}>
              <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1, color: assessment.overallScore >= 75 ? '#6ee7b7' : assessment.overallScore >= 50 ? '#fde047' : '#fca5a5' }}>
                {assessment.overallScore}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#a7f3d0', marginTop: '0.4rem', fontWeight: 600 }}>
                OUT OF 100
              </div>
            </div>
          </div>

          {/* 6 Dimension Score Breakdown */}
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            Evaluation Dimensions Breakdown
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {assessment.dimensionScores &&
              Object.entries({
                relevance: { label: 'Relevance to Target Career', weight: '25%' },
                contribution: { label: 'Contribution & Initiative', weight: '20%' },
                outcomes: { label: 'Demonstrated Outcomes & Impact', weight: '20%' },
                achievementLevel: { label: 'Achievement Level & Recognition', weight: '15%' },
                consistency: { label: 'Sustained Participation', weight: '10%' },
                evidence: { label: 'Evidence & Verifiability', weight: '10%' }
              }).map(([key, meta]) => {
                const dim = assessment.dimensionScores[key] || { score: 0, max: 10, feedback: '' };
                const pct = Math.round((dim.score / dim.max) * 100);

                return (
                  <div
                    key={key}
                    className="card"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.1rem',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {meta.label}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)' }}>
                        {dim.score} / {dim.max} pts ({meta.weight})
                      </span>
                    </div>

                    <div style={{ width: '100%', height: '6px', background: 'var(--bg-subtle)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: getScoreColor(pct),
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>

                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      {dim.feedback}
                    </p>
                  </div>
                );
              })}
          </div>

          {/* Strongest Contributions & Key Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ color: 'var(--success)', fontSize: '1.2rem' }}>★</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Strongest Contributions
                </h3>
              </div>
              <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                {assessment.strongestContributions?.map((item, idx) => (
                  <li key={idx} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>🎯</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Most Relevant to {assessment.targetRole}
                </h3>
              </div>
              <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                {assessment.roleRelevantHighlights?.map((item, idx) => (
                  <li key={idx} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Resume & LinkedIn Presentation Tips */}
          {assessment.resumeLinkedInPresentation && assessment.resumeLinkedInPresentation.length > 0 && (
            <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                💼 How to Present Achievements on Resume & LinkedIn
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {assessment.resumeLinkedInPresentation.map((pres, idx) => (
                  <div key={idx} style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                      {pres.achievementTitle}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      <strong>Resume Bullet:</strong> "{pres.bulletSuggestion}"
                    </div>
                    {pres.linkedinTip && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 500 }}>
                        <strong>LinkedIn Tip:</strong> {pres.linkedinTip}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Next Activities (Distinct from completed) */}
          {assessment.recommendedActivities && assessment.recommendedActivities.length > 0 && (
            <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🔭</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Recommended Future Activities (Not yet completed)
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Concrete actions tailored to your current experience level to maximize placement readiness:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {assessment.recommendedActivities.map((act, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px dashed var(--primary)',
                      background: 'var(--primary-light)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', background: '#fff', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)' }}>
                        {act.category} • {act.timeline}
                      </span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>Future Milestone</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      {act.title}
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                      {act.rationale}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 30-Day and 60-Day Action Plans */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                🗓️ 30-Day Action Roadmap
              </h3>
              <ol style={{ paddingLeft: '1.25rem', margin: 0 }}>
                {assessment.actionPlan30Days?.map((plan, i) => (
                  <li key={i} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '0.65rem', lineHeight: 1.5 }}>
                    {plan}
                  </li>
                ))}
              </ol>
            </div>

            <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                🚀 60-Day Action Roadmap
              </h3>
              <ol style={{ paddingLeft: '1.25rem', margin: 0 }}>
                {assessment.actionPlan60Days?.map((plan, i) => (
                  <li key={i} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '0.65rem', lineHeight: 1.5 }}>
                    {plan}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Retake / Edit Button */}
          <div style={{ textAlign: 'center', padding: '1rem 0 3rem' }}>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="btn btn-primary"
              style={{ padding: '0.75rem 2rem', fontWeight: 700, borderRadius: 'var(--radius-md)' }}
            >
              Update Achievements / Retake Assessment &rarr;
            </button>
          </div>
        </div>
      ) : (
        /* Real Assessment Form */
        <form onSubmit={handleSubmitAssessment} className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2rem', boxShadow: 'var(--shadow-sm)' }}>
          {/* Introductory Mandatory Question */}
          <div style={{ background: 'var(--bg-subtle)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', border: '1px solid var(--border-color)' }}>
            <label style={{ display: 'block', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              Have you participated in any co-curricular, extracurricular, leadership, technical, or community activities?
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                {
                  id: 'achievements',
                  label: 'Yes, I have achievements to report.',
                  desc: 'Log hackathons, coding contests, club leadership, open source contributions, or awards.'
                },
                {
                  id: 'activities_no_formal',
                  label: 'I have participated in activities but have no formal achievements yet.',
                  desc: 'Attended workshops, volunteered in technical fests, or built team projects without winning formal rank.'
                },
                {
                  id: 'none_want_to_improve',
                  label: 'Not yet, but I want to improve my profile.',
                  desc: 'Establish an honest baseline and receive a structured starter action plan without penalty.'
                }
              ].map((opt) => (
                <label
                  key={opt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: participationStatus === opt.id ? 'var(--primary-light)' : '#fff',
                    border: participationStatus === opt.id ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="participationStatus"
                    value={opt.id}
                    checked={participationStatus === opt.id}
                    onChange={(e) => setParticipationStatus(e.target.value)}
                    style={{ marginTop: '0.2rem' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'block' }}>
                      {opt.label}
                    </strong>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {opt.desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Academic Context */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Target Career Role</label>
              <input
                type="text"
                className="form-control"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Software Engineer, Backend Developer"
                style={{ width: '100%', padding: '0.55rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Current Academic Year</label>
              <select
                className="form-control"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                style={{ width: '100%', padding: '0.55rem' }}
              >
                <option value="1st Year">1st Year (Freshman)</option>
                <option value="2nd Year">2nd Year (Sophomore)</option>
                <option value="3rd Year">3rd Year (Junior)</option>
                <option value="Final Year">Final Year (Senior)</option>
                <option value="Recent Graduate">Recent Graduate</option>
              </select>
            </div>
          </div>

          {/* Category Tabs & Achievements Entry Form (When user has participated) */}
          {participationStatus !== 'none_want_to_improve' ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Achievement Categories
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Total Added: <strong>{achievements.length}</strong>
                </span>
              </div>

              {/* Category Selection Tabs */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {CATEGORIES.map((cat) => {
                  const count = achievements.filter((a) => a.category === cat.key).length;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setActiveCategoryTab(cat.key)}
                      className={`btn btn-sm ${activeCategoryTab === cat.key ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ borderRadius: 'var(--radius-full)', padding: '0.35rem 0.85rem' }}
                    >
                      <span>{cat.icon}</span> {cat.title} {count > 0 && `(${count})`}
                    </button>
                  );
                })}
              </div>

              {/* Active Category Header */}
              {(() => {
                const currentCat = CATEGORIES.find((c) => c.key === activeCategoryTab);
                const itemsInCat = achievements
                  .map((item, index) => ({ item, index }))
                  .filter(({ item }) => item.category === activeCategoryTab);

                return (
                  <div style={{ background: 'var(--bg-page)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {currentCat?.icon} {currentCat?.title}
                        </h4>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {currentCat?.description}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddAchievement(activeCategoryTab)}
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.82rem' }}
                      >
                        + Add Another Achievement
                      </button>
                    </div>

                    {itemsInCat.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                        No achievements added in this category yet. Click <strong>+ Add Another Achievement</strong> above, or switch to another category.
                      </div>
                    ) : (
                      itemsInCat.map(({ item, index }) => (
                        <div
                          key={index}
                          style={{
                            background: '#fff',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            padding: '1.25rem',
                            marginBottom: '1rem',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                              Entry #{index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAchievement(index)}
                              style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Remove
                            </button>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Event / Activity / Project Title *</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. Smart India Hackathon 2024"
                                value={item.title}
                                onChange={(e) => handleUpdateAchievement(index, 'title', e.target.value)}
                                style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem' }}
                                required
                              />
                            </div>

                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Organizer / Organization</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. Ministry of Education / Google Developer Groups"
                                value={item.organizer}
                                onChange={(e) => handleUpdateAchievement(index, 'organizer', e.target.value)}
                                style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem' }}
                              />
                            </div>

                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Date or Year</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. Oct 2023 - Present or 2024"
                                value={item.date}
                                onChange={(e) => handleUpdateAchievement(index, 'date', e.target.value)}
                                style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem' }}
                              />
                            </div>

                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Your Role / Position</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. Team Lead, Core Contributor, Participant"
                                value={item.role}
                                onChange={(e) => handleUpdateAchievement(index, 'role', e.target.value)}
                                style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem' }}
                              />
                            </div>

                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Result / Award / Outcome</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder={currentCat?.sampleResult}
                                value={item.resultAward}
                                onChange={(e) => handleUpdateAchievement(index, 'resultAward', e.target.value)}
                                style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem' }}
                              />
                            </div>

                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Supporting Evidence Link (Certificate/Repo/Event)</label>
                              <input
                                type="url"
                                className="form-control"
                                placeholder="https://github.com/... or https://drive.google.com/..."
                                value={item.evidenceUrl}
                                onChange={(e) => handleUpdateAchievement(index, 'evidenceUrl', e.target.value)}
                                style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem' }}
                              />
                            </div>

                            <div style={{ gridColumn: '1 / -1' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Personal Contribution (What did YOU personally build or manage?)</label>
                              <textarea
                                className="form-control"
                                rows="2"
                                placeholder="Architected the backend REST APIs using Node.js and MongoDB, handling authentication and database indexing..."
                                value={item.contribution}
                                onChange={(e) => handleUpdateAchievement(index, 'contribution', e.target.value)}
                                style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem' }}
                              />
                            </div>

                            <div style={{ gridColumn: '1 / -1' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Measurable Impact / Demonstrated Outcomes</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. Selected out of 500+ teams; served 2,000+ active users at college tech fest"
                                value={item.impact}
                                onChange={(e) => handleUpdateAchievement(index, 'impact', e.target.value)}
                                style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem' }}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div style={{ background: 'var(--info-bg)', border: '1px solid var(--info-border)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', color: 'var(--info-text)', fontSize: '0.9rem' }}>
              ℹ️ You selected that you have no co-curricular achievements yet. Submitting will establish an honest early-career baseline and generate an achievable 30/60-day action plan to build your candidate profile without penalty.
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', alignItems: 'center' }}>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{ padding: '0.75rem 2.25rem', fontWeight: 700, borderRadius: 'var(--radius-md)' }}
            >
              {submitting ? 'Calculating Score...' : 'Submit & Calculate Co-Curricular Score'}
            </button>
            {assessment && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn btn-secondary"
                style={{ padding: '0.75rem 1.5rem' }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default AchievementAssessment;
