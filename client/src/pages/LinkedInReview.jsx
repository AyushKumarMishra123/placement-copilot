import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { linkedinAPI, profileAPI } from '../services/api';
import Alert from '../components/Alert';

const LinkedInReview = () => {
  const [activeTab, setActiveTab] = useState('url'); // 'url' | 'pdf' | 'manual'
  const [url, setUrl] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [manualData, setManualData] = useState({
    fullName: '',
    headline: '',
    about: '',
    skills: '',
    experienceText: '',
    projectsText: '',
    educationText: '',
    featuredLinks: '',
    achievementsText: ''
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [limitationNotice, setLimitationNotice] = useState('');
  const [review, setReview] = useState(null);
  const [history, setHistory] = useState([]);
  const [copiedField, setCopiedField] = useState(null);
  const [checklistState, setChecklistState] = useState({});

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setInitialLoading(true);
    try {
      const [profileRes, latestRes, historyRes] = await Promise.allSettled([
        profileAPI.get(),
        linkedinAPI.getLatest(),
        linkedinAPI.getHistory()
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.data.data?.profile) {
        const p = profileRes.value.data.data.profile;
        if (p.targetRole) setTargetRole(p.targetRole);
        if (p.linkedin) {
          const formatted = p.linkedin.startsWith('http')
            ? p.linkedin
            : `https://www.linkedin.com/in/${p.linkedin}`;
          setUrl(formatted);
        }
      }

      if (latestRes.status === 'fulfilled' && latestRes.value.data.data?.review) {
        const rev = latestRes.value.data.data.review;
        setReview(rev);
        initChecklist(rev.actionChecklist);
      }

      if (historyRes.status === 'fulfilled' && historyRes.value.data.data?.history) {
        setHistory(historyRes.value.data.data.history);
      }
    } catch (err) {
      console.warn('[LinkedIn Load Note]', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const initChecklist = (items = []) => {
    const state = {};
    items.forEach((item) => {
      state[item.id] = item.completed;
    });
    setChecklistState(state);
  };

  const toggleChecklistItem = (id) => {
    setChecklistState((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLimitationNotice('');

    if (activeTab === 'url') {
      if (!url.trim()) {
        setError('Please enter your LinkedIn profile URL (e.g. https://www.linkedin.com/in/username).');
        return;
      }
      setLoading(true);
      try {
        const res = await linkedinAPI.analyze({
          inputMethod: 'url',
          url: url.trim(),
          targetRole
        });
        const rev = res.data.data.review;
        setReview(rev);
        initChecklist(rev.actionChecklist);
        setHistory((prev) => [rev, ...prev.filter((h) => h._id !== rev._id)]);
      } catch (err) {
        if (err.response?.status === 422 || err.response?.data?.errorCode === 'LINKEDIN_AUTH_RESTRICTED') {
          setLimitationNotice(
            err.response?.data?.message ||
              'LinkedIn prevents automated public profile scraping. Please upload your LinkedIn Profile PDF ("More > Save to PDF" on LinkedIn) or paste your profile information below.'
          );
          setActiveTab('pdf');
        } else {
          setError(err.response?.data?.message || 'Failed to analyze LinkedIn profile.');
        }
      } finally {
        setLoading(false);
      }
    } else if (activeTab === 'pdf') {
      if (!pdfFile) {
        setError('Please select a LinkedIn Profile PDF file to upload.');
        return;
      }
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append('file', pdfFile);
        formData.append('targetRole', targetRole);

        const res = await linkedinAPI.uploadPdf(formData);
        const rev = res.data.data.review;
        setReview(rev);
        initChecklist(rev.actionChecklist);
        setHistory((prev) => [rev, ...prev.filter((h) => h._id !== rev._id)]);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to parse and analyze LinkedIn PDF.');
      } finally {
        setLoading(false);
      }
    } else if (activeTab === 'manual') {
      if (!manualData.headline.trim() && !manualData.about.trim() && !manualData.skills.trim()) {
        setError('Please fill in at least your headline, summary, or core skills to analyze.');
        return;
      }
      setLoading(true);
      try {
        const parsedProfile = {
          fullName: manualData.fullName,
          headline: manualData.headline,
          about: manualData.about,
          skills: manualData.skills.split(',').map((s) => s.trim()).filter(Boolean),
          experience: manualData.experienceText
            ? [{ title: manualData.experienceText.slice(0, 100), description: manualData.experienceText }]
            : [],
          projects: manualData.projectsText
            ? [{ name: 'Featured Project', description: manualData.projectsText }]
            : [],
          education: manualData.educationText
            ? [{ school: manualData.educationText, degree: 'B.Tech / Degree' }]
            : [],
          featuredLinks: manualData.featuredLinks
            ? [{ title: 'Portfolio / GitHub', url: manualData.featuredLinks }]
            : [],
          achievements: manualData.achievementsText
            ? manualData.achievementsText.split('\n').filter(Boolean)
            : []
        };

        const res = await linkedinAPI.analyze({
          inputMethod: 'manual',
          profileData: parsedProfile,
          targetRole
        });
        const rev = res.data.data.review;
        setReview(rev);
        initChecklist(rev.actionChecklist);
        setHistory((prev) => [rev, ...prev.filter((h) => h._id !== rev._id)]);
      } catch (err) {
        setError(err.response?.data?.message || 'Manual profile analysis failed.');
      } finally {
        setLoading(false);
      }
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--warning)';
    return 'var(--danger)';
  };

  const categoryNames = {
    headline: { label: 'Headline & Positioning', max: 10 },
    about: { label: 'About / Summary Section', max: 15 },
    experience: { label: 'Experience & Responsibilities', max: 15 },
    projects: { label: 'Projects & Demonstrated Work', max: 15 },
    skills: { label: 'Skills & Technical Relevance', max: 15 },
    education: { label: 'Education & Certifications', max: 10 },
    featured: { label: 'Featured Portfolio & GitHub Links', max: 10 },
    achievements: { label: 'Achievements & Measurable Impact', max: 10 }
  };

  if (initialLoading) {
    return (
      <div className="page-container" style={{ padding: '2rem 1rem', maxWidth: '1080px', margin: '0 auto' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading LinkedIn Review module...</p>
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
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Official 100-Point Rubric</span>
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          LinkedIn Profile Review
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '780px', fontSize: '0.95rem', lineHeight: '1.6' }}>
          Evaluate your LinkedIn presence against recruiter search standards. We assess headline clarity, summary depth, project evidence, ATS keywords, and external proof to calculate an explainable, deterministic score out of 100.
        </p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {limitationNotice && (
        <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <div>
            <strong style={{ color: 'var(--warning-text)', display: 'block', marginBottom: '0.25rem' }}>
              LinkedIn Access Limitation Notice
            </strong>
            <p style={{ color: 'var(--warning-text)', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
              {limitationNotice}
            </p>
          </div>
        </div>
      )}

      {/* Analysis Input Box */}
      <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', marginBottom: '2rem', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Submit Profile for Analysis
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
              Select how you want to provide your profile information.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Target Role:</label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="form-control"
              style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)' }}
            >
              <option value="Software Engineer">Software Engineer</option>
              <option value="Full-Stack Developer">Full-Stack Developer</option>
              <option value="Frontend Developer">Frontend Developer</option>
              <option value="Backend Developer">Backend Developer</option>
              <option value="AI/ML Engineer">AI/ML Engineer</option>
              <option value="Data Scientist">Data Scientist</option>
            </select>
          </div>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`btn btn-sm ${activeTab === 'url' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 'var(--radius-full)', padding: '0.4rem 1rem' }}
          >
            1. LinkedIn Profile URL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`btn btn-sm ${activeTab === 'pdf' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 'var(--radius-full)', padding: '0.4rem 1rem' }}
          >
            2. Upload Profile PDF (Recommended)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`btn btn-sm ${activeTab === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 'var(--radius-full)', padding: '0.4rem 1rem' }}
          >
            3. Paste Profile Manually
          </button>
        </div>

        {/* Form Body */}
        {activeTab === 'url' && (
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              LinkedIn Public Profile URL
            </label>
            <input
              type="url"
              className="form-control"
              placeholder="https://www.linkedin.com/in/your-username"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.85rem', marginBottom: '0.5rem' }}
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Note: LinkedIn restricts automated unauthenticated scraping. If your profile is private or behind authentication walls, use the <strong>Upload Profile PDF</strong> tab.
            </p>
          </div>
        )}

        {activeTab === 'pdf' && (
          <div>
            <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.5rem', textAlign: 'center', background: 'var(--bg-subtle)', marginBottom: '1rem' }}>
              <input
                type="file"
                id="pdf-upload"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
              />
              <label htmlFor="pdf-upload" style={{ cursor: 'pointer', display: 'block' }}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📄</span>
                <span style={{ fontWeight: 600, color: 'var(--primary)', display: 'block' }}>
                  {pdfFile ? pdfFile.name : 'Click to select your LinkedIn Profile PDF'}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  On LinkedIn: Navigate to your profile &rarr; click "More" button &rarr; select "Save to PDF"
                </span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'manual' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Full Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="Jane Doe"
                value={manualData.fullName}
                onChange={(e) => setManualData({ ...manualData, fullName: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Current Headline</label>
              <input
                type="text"
                className="form-control"
                placeholder="Full-Stack Engineer | React, Node.js"
                value={manualData.headline}
                onChange={(e) => setManualData({ ...manualData, headline: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>About / Summary</label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Paste your LinkedIn summary section..."
                value={manualData.about}
                onChange={(e) => setManualData({ ...manualData, about: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Technical Skills (comma-separated)</label>
              <input
                type="text"
                className="form-control"
                placeholder="React, Node.js, Python, PostgreSQL, Docker, Git"
                value={manualData.skills}
                onChange={(e) => setManualData({ ...manualData, skills: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Experience Snippet</label>
              <textarea
                className="form-control"
                rows="2"
                placeholder="Software Engineer Intern at XYZ - Built microservices..."
                value={manualData.experienceText}
                onChange={(e) => setManualData({ ...manualData, experienceText: e.target.value })}
                style={{ width: '100%', padding: '0.5rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Projects & External Links</label>
              <textarea
                className="form-control"
                rows="2"
                placeholder="E-Commerce API (https://github.com/...), Portfolio..."
                value={manualData.projectsText}
                onChange={(e) => setManualData({ ...manualData, projectsText: e.target.value })}
                style={{ width: '100%', padding: '0.5rem' }}
              />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.75rem' }}>
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: '0.75rem 2rem', fontWeight: 700, fontSize: '0.95rem', borderRadius: 'var(--radius-md)' }}
          >
            {loading ? 'Analyzing Profile...' : 'Analyze My LinkedIn Profile'}
          </button>
        </div>
      </div>

      {/* Review Results */}
      {review && (
        <div style={{ marginTop: '2.5rem' }}>
          {/* Top Score Banner */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
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
              <span style={{ fontSize: '0.85rem', letterSpacing: '0.05em', color: '#a5b4fc', fontWeight: 700, textTransform: 'uppercase' }}>
                Analysis Completed • {new Date(review.reviewedAt || review.createdAt).toLocaleDateString()}
              </span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.4rem 0' }}>
                LinkedIn Profile Score
              </h2>
              <p style={{ color: '#e0e7ff', fontSize: '0.92rem', maxWidth: '520px', margin: 0 }}>
                Target Role: <strong>{review.targetRole}</strong>. Evaluated across 8 core dimensions using deterministic rubric rules with AI-driven optimization guidance.
              </p>
            </div>

            <div style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.1)', padding: '1.25rem 2rem', borderRadius: 'var(--radius-md)', backdropFilter: 'blur(8px)', minWidth: '160px' }}>
              <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1, color: review.overallScore >= 75 ? '#34d399' : review.overallScore >= 50 ? '#fbbf24' : '#f87171' }}>
                {review.overallScore}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#c7d2fe', marginTop: '0.4rem', fontWeight: 600 }}>
                OUT OF 100
              </div>
            </div>
          </div>

          {/* Category-Wise Scores with Progress Bars */}
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            Category-Wise Rubric Breakdown
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {Object.entries(categoryNames).map(([key, meta]) => {
              const cat = review.categoryScores?.[key] || { score: 0, max: meta.max, status: 'unavailable', feedback: '' };
              const percent = Math.round((cat.score / meta.max) * 100);
              const isUnavailable = cat.status === 'unavailable';

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
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        background: isUnavailable ? 'var(--bg-subtle)' : cat.score >= meta.max * 0.75 ? 'var(--success-bg)' : 'var(--warning-bg)',
                        color: isUnavailable ? 'var(--text-muted)' : cat.score >= meta.max * 0.75 ? 'var(--success-text)' : 'var(--warning-text)'
                      }}
                    >
                      {isUnavailable ? 'Unavailable' : `${cat.score} / ${meta.max} pts`}
                    </span>
                  </div>

                  <div style={{ width: '100%', height: '6px', background: 'var(--bg-subtle)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                    <div
                      style={{
                        width: `${percent}%`,
                        height: '100%',
                        background: isUnavailable ? 'var(--text-muted)' : getScoreColor(percent),
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    {cat.feedback || 'Section evaluated against standard criteria.'}
                  </p>
                </div>
              );
            })}
          </div>

          {/* 3 Strengths & 3 Weaknesses */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Strengths */}
            <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ color: 'var(--success)', fontSize: '1.2rem' }}>✔</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Top 3 Profile Strengths
                </h3>
              </div>
              <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                {review.strengths?.map((s, idx) => (
                  <li key={idx} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ color: 'var(--danger)', fontSize: '1.2rem' }}>▲</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Top 3 Critical Weaknesses
                </h3>
              </div>
              <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                {review.weaknesses?.map((w, idx) => (
                  <li key={idx} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Improved Headline Comparison */}
          {review.improvedHeadline && (
            <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  ✨ Optimized Headline Suggestion
                </h3>
                <button
                  type="button"
                  onClick={() => copyToClipboard(review.improvedHeadline, 'headline')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.8rem' }}
                >
                  {copiedField === 'headline' ? 'Copied!' : 'Copy Suggestion'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                    Current Headline
                  </span>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>
                    {review.profileData?.headline || '— (No headline listed)'}
                  </p>
                </div>

                <div style={{ background: 'var(--primary-light)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-focus)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                    Tailored Recommendation
                  </span>
                  <p style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 600, margin: 0 }}>
                    {review.improvedHeadline}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Improved About Section */}
          {review.improvedAbout && (
            <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    📝 Ground-Truth Optimized About Section
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Generated strictly using your actual verified skills, projects, and target role.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(review.improvedAbout, 'about')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.8rem' }}
                >
                  {copiedField === 'about' ? 'Copied!' : 'Copy About Text'}
                </button>
              </div>

              <div style={{ background: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-line', fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                {review.improvedAbout}
              </div>
            </div>
          )}

          {/* Actionable Improvement Checklist */}
          {review.actionChecklist && review.actionChecklist.length > 0 && (
            <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                ✅ Actionable Profile Improvement Checklist
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {review.actionChecklist.map((item) => {
                  const isChecked = checklistState[item.id] !== undefined ? checklistState[item.id] : item.completed;
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleChecklistItem(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        background: isChecked ? 'var(--success-bg)' : 'var(--bg-subtle)',
                        border: isChecked ? '1px solid var(--success-border)' : '1px solid transparent',
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <span
                        style={{
                          fontSize: '0.88rem',
                          color: isChecked ? 'var(--success-text)' : 'var(--text-primary)',
                          textDecoration: isChecked ? 'line-through' : 'none',
                          flex: 1
                        }}
                      >
                        {item.task}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '0.15rem 0.5rem',
                          borderRadius: 'var(--radius-full)',
                          background: item.priority === 'high' ? 'var(--danger-bg)' : 'var(--bg-surface)',
                          color: item.priority === 'high' ? 'var(--danger-text)' : 'var(--text-muted)'
                        }}
                      >
                        {item.priority} priority
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommended Target Role Keywords */}
          {review.recommendedKeywords && review.recommendedKeywords.length > 0 && (
            <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                🏷️ Recommended ATS Keywords for {review.targetRole}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Incorporate these verified terms into your skills and experience bullets to appear in high-intent recruiter searches:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {review.recommendedKeywords.map((kw, i) => (
                  <span
                    key={i}
                    style={{
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      border: '1px solid var(--primary-focus)',
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.82rem',
                      fontWeight: 600
                    }}
                  >
                    + {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Score History Progression */}
          {history.length > 1 && (
            <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                📈 Historical Score Progression
              </h3>
              <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {history.map((h, i) => (
                  <div
                    key={h._id || i}
                    style={{
                      minWidth: '130px',
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-subtle)',
                      textAlign: 'center',
                      border: h._id === review._id ? '2px solid var(--primary)' : '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: getScoreColor(h.overallScore) }}>
                      {h.overallScore}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {new Date(h.reviewedAt || h.createdAt).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                      {h.inputMethod}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Retake CTA */}
          <div style={{ textAlign: 'center', padding: '1rem 0 3rem' }}>
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="btn btn-secondary"
              style={{ padding: '0.65rem 1.75rem', fontWeight: 600 }}
            >
              Analyze Updated Profile Again &uarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinkedInReview;
