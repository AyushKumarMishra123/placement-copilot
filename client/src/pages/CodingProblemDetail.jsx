import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { codingAPI } from '../services/api';
import Alert from '../components/Alert';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript (Node.js)' },
  { id: 'python', label: 'Python 3' },
  { id: 'cpp', label: 'C++ (g++)' },
  { id: 'java', label: 'Java (OpenJDK)' }
];

const CodingProblemDetail = () => {
  const { id } = useParams();
  const [problem, setProblem] = useState(null);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Workspace state
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [runningSample, setRunningSample] = useState(false);
  const [sampleResults, setSampleResults] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [activeTab, setActiveTab] = useState('description'); // 'description' | 'submissions'
  const [showHints, setShowHints] = useState(false);
  const [judge0Health, setJudge0Health] = useState(null);

  useEffect(() => {
    // Check Judge0 online status
    codingAPI.getHealth().then((res) => {
      setJudge0Health(res.data.data?.judge0 || null);
    }).catch(() => {
      setJudge0Health({ reachable: false, error: 'Could not connect to backend health check.' });
    });

    const fetchProblem = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await codingAPI.getById(id);
        const p = res.data.data.problem;
        setProblem(p);
        setRecentSubmissions(res.data.data.recentSubmissions || []);

        // Initialize code with starter template
        const defaultCode = p.starterCode?.[selectedLanguage] || p.starterCode?.javascript || '';
        setCode(defaultCode);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load coding challenge.');
      } finally {
        setLoading(false);
      }
    };

    fetchProblem();
  }, [id]);

  const handleLanguageChange = (lang) => {
    setSelectedLanguage(lang);
    if (problem?.starterCode?.[lang]) {
      setCode(problem.starterCode[lang]);
    }
    setSampleResults(null);
    setSubmissionResult(null);
  };

  const handleResetCode = () => {
    if (problem?.starterCode?.[selectedLanguage]) {
      setCode(problem.starterCode[selectedLanguage]);
    }
  };

  const handleRunSampleTests = async () => {
    if (!code.trim()) return;
    try {
      setRunningSample(true);
      setError('');
      setSubmissionResult(null);
      const res = await codingAPI.runSample(id, {
        code,
        language: selectedLanguage
      });
      setSampleResults(res.data.data);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Sample test execution failed.';
      setError(msg);
    } finally {
      setRunningSample(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (!code.trim()) return;
    try {
      setSubmitting(true);
      setError('');
      setSampleResults(null);
      const res = await codingAPI.submit(id, {
        code,
        language: selectedLanguage
      });
      setSubmissionResult(res.data.data.submission);

      // Refresh recent submissions
      const updatedProb = await codingAPI.getById(id);
      setRecentSubmissions(updatedProb.data.data.recentSubmissions || []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Solution submission failed.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getDifficultyBadge = (diff) => {
    const d = (diff || '').toLowerCase();
    if (d === 'easy') return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
    if (d === 'medium') return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
    return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' };
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        <p>Loading coding challenge...</p>
      </div>
    );
  }

  if (error && !problem) {
    return (
      <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <Alert type="error" message={error} />
        <div style={{ marginTop: '1rem' }}>
          <Link to="/coding" className="btn btn-secondary">
            &larr; Back to Challenges
          </Link>
        </div>
      </div>
    );
  }

  const diffBadge = getDifficultyBadge(problem.difficulty);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Top Breadcrumb & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
          <Link to="/coding" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
            &larr; All Challenges
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--text-muted)' }}>{problem.topic}</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <strong style={{ color: 'var(--text-primary)' }}>{problem.title}</strong>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span
            style={{
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: diffBadge.bg,
              color: diffBadge.text,
              border: `1px solid ${diffBadge.border}`,
              fontSize: '0.75rem',
              fontWeight: 700
            }}
          >
            {problem.difficulty}
          </span>
          <span
            style={{
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-secondary)'
            }}
          >
            Max Score: {problem.maxScore || 100} pts
          </span>
        </div>
      </div>

      {error && <Alert type="error" message={error} style={{ marginBottom: '1rem' }} />}

      {/* Split-pane Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(400px, 1.25fr)', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Pane: Problem Description */}
        <div className="card" style={{ padding: '1.5rem', maxHeight: '82vh', overflowY: 'auto' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.25rem' }}>
            <button
              onClick={() => setActiveTab('description')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'description' ? 700 : 500,
                color: activeTab === 'description' ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'description' ? '2px solid var(--primary)' : 'none',
                fontSize: '0.88rem'
              }}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'submissions' ? 700 : 500,
                color: activeTab === 'submissions' ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'submissions' ? '2px solid var(--primary)' : 'none',
                fontSize: '0.88rem'
              }}
            >
              My Submissions ({recentSubmissions.length})
            </button>
          </div>

          {activeTab === 'description' ? (
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                {problem.title}
              </h2>

              <div style={{ fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-line', marginBottom: '1.5rem' }}>
                {problem.description}
              </div>

              {/* Sample Test Cases */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Sample Test Cases</h3>
                {(problem.testCases || []).map((tc, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-secondary)',
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      marginBottom: '0.75rem',
                      fontSize: '0.82rem',
                      fontFamily: 'monospace'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                      Sample #{idx + 1}
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-secondary)' }}>Input:</strong>
                      <pre style={{ margin: '0.2rem 0', whiteSpace: 'pre-wrap' }}>{tc.input}</pre>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-secondary)' }}>Expected Output:</strong>
                      <pre style={{ margin: '0.2rem 0', color: 'var(--success)' }}>{tc.expectedOutput}</pre>
                    </div>
                    {tc.explanation && (
                      <div style={{ marginTop: '0.4rem', fontFamily: 'inherit', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        <em>Explanation:</em> {tc.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Constraints */}
              {problem.constraints && problem.constraints.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>Constraints</h3>
                  <ul style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {problem.constraints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Hints */}
              {problem.hints && problem.hints.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowHints(!showHints)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.78rem' }}
                  >
                    {showHints ? 'Hide Hints' : '💡 Show Hints'}
                  </button>
                  {showHints && (
                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fef3c7', borderRadius: 'var(--radius-sm)', border: '1px solid #fde68a' }}>
                      {problem.hints.map((h, i) => (
                        <p key={i} style={{ margin: '0.25rem 0', fontSize: '0.82rem', color: '#92400e' }}>
                          Hint {i + 1}: {h}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Recent Submissions</h3>
              {recentSubmissions.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No submissions made yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {recentSubmissions.map((sub, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        background: sub.status === 'Accepted' ? '#dcfce7' : '#fee2e2',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.82rem'
                      }}
                    >
                      <div>
                        <strong style={{ color: sub.status === 'Accepted' ? '#15803d' : '#b91c1c' }}>
                          {sub.status}
                        </strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Score: {sub.score} pts &bull; {sub.passedTestCases}/{sub.totalTestCases} passed
                        </div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Pane: Code Editor and Execution */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            {/* Editor Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Language:
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="input"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.82rem' }}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>

                {judge0Health && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      background: judge0Health.reachable ? '#dcfce7' : '#fee2e2',
                      color: judge0Health.reachable ? '#15803d' : '#b91c1c',
                      fontWeight: 600,
                      border: `1px solid ${judge0Health.reachable ? '#bbf7d0' : '#fecaca'}`
                    }}
                    title={
                      judge0Health.reachable
                        ? `Judge0 Online (latency: ${judge0Health.latencyMs}ms)`
                        : `Judge0 Offline: ${judge0Health.error || 'Cannot connect'}`
                    }
                  >
                    {judge0Health.reachable ? '● Judge0 Online' : '▲ Judge0 Offline'}
                  </span>
                )}
              </div>

              <button
                onClick={handleResetCode}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                title="Reset to original starter code"
              >
                Reset Starter Code
              </button>
            </div>

            {/* Code Input Area */}
            <textarea
              className="input"
              rows={18}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Write your solution here..."
              style={{
                width: '100%',
                fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.88rem',
                lineHeight: 1.45,
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                padding: '0.85rem',
                borderRadius: 'var(--radius-sm)',
                resize: 'vertical'
              }}
              spellCheck="false"
            />

            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                onClick={handleRunSampleTests}
                disabled={runningSample || submitting || !code.trim()}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', fontWeight: 600 }}
              >
                {runningSample ? 'Running Sample Tests...' : 'Run Sample Tests'}
              </button>
              <button
                onClick={handleSubmitSolution}
                disabled={runningSample || submitting || !code.trim()}
                className="btn btn-primary"
                style={{ fontSize: '0.85rem', fontWeight: 700 }}
              >
                {submitting ? 'Evaluating Test Suite...' : 'Submit Code 🚀'}
              </button>
            </div>
          </div>

          {/* Sample Run Results Panel */}
          {sampleResults && (
            <div className="card" style={{ padding: '1.25rem', borderLeft: sampleResults.allPassed ? '4px solid #10b981' : '4px solid #ef4444' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: sampleResults.allPassed ? '#15803d' : '#b91c1c' }}>
                  {sampleResults.allPassed ? '✓ All Sample Tests Passed' : '✖ Some Sample Tests Failed'}
                </h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {sampleResults.passedCount} / {sampleResults.totalCount} passed
                </span>
              </div>

              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {sampleResults.results.map((res, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'var(--bg-secondary)',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontFamily: 'monospace'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <strong>Sample #{res.testCaseIndex}</strong>
                      <span style={{ color: res.passed ? '#15803d' : '#b91c1c', fontWeight: 700 }}>
                        {res.status} ({res.runtimeMs}ms)
                      </span>
                    </div>
                    {!res.passed && (
                      <div style={{ marginTop: '0.25rem', color: '#b91c1c' }}>
                        {res.expectedOutput && <div>Expected: "{res.expectedOutput}"</div>}
                        {res.actualOutput !== undefined && <div>Received: "{res.actualOutput}"</div>}
                        {res.compileOutput ? (
                          <div style={{ marginTop: '0.35rem' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#ef4444' }}>Compiler Output:</div>
                            <pre style={{ margin: '0.2rem 0', padding: '0.4rem', background: '#450a0a', color: '#fca5a5', borderRadius: '4px', overflowX: 'auto', fontSize: '0.75rem' }}>
                              {res.compileOutput}
                            </pre>
                          </div>
                        ) : res.error ? (
                          <div style={{ color: '#ef4444', marginTop: '0.2rem' }}>Error: {res.error}</div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Submission Result Panel */}
          {submissionResult && (
            <div
              className="card"
              style={{
                padding: '1.5rem',
                borderLeft: submissionResult.status === 'Accepted' ? '5px solid #10b981' : '5px solid #ef4444',
                backgroundColor: submissionResult.status === 'Accepted' ? 'rgba(16, 185, 129, 0.04)' : 'rgba(239, 68, 68, 0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: 'var(--text-muted)' }}>
                    Submission Verdict
                  </span>
                  <h3
                    style={{
                      fontSize: '1.4rem',
                      fontWeight: 800,
                      margin: '0.15rem 0',
                      color: submissionResult.status === 'Accepted' ? '#15803d' : '#b91c1c'
                    }}
                  >
                    {submissionResult.status}
                  </h3>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {submissionResult.score} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ {problem.maxScore || 100}</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {submissionResult.passedTestCases} / {submissionResult.totalTestCases} test cases passed
                  </span>
                </div>
              </div>

              {/* Compilation Error Banner if compilation failed */}
              {submissionResult.status === 'Compilation Error' && (
                <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem', padding: '0.75rem', background: '#450a0a', borderRadius: 'var(--radius-sm)', border: '1px solid #7f1d1d' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fca5a5', marginBottom: '0.35rem' }}>
                    Compilation Error:
                  </div>
                  <pre style={{ margin: 0, padding: 0, background: 'transparent', color: '#fecaca', fontSize: '0.78rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                    {submissionResult.testCaseResults?.[0]?.compileOutput || submissionResult.testCaseResults?.[0]?.error || 'Compilation failed. Please inspect syntax and headers.'}
                  </pre>
                </div>
              )}

              {/* Test Case Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '0.35rem', marginTop: '1rem' }}>
                {(submissionResult.testCaseResults || []).map((tcr, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '0.35rem',
                      textAlign: 'center',
                      borderRadius: 'var(--radius-sm)',
                      background: tcr.passed ? '#dcfce7' : '#fee2e2',
                      color: tcr.passed ? '#15803d' : '#b91c1c',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      border: `1px solid ${tcr.passed ? '#bbf7d0' : '#fecaca'}`
                    }}
                    title={`Test #${tcr.testCaseIndex}: ${tcr.status} ${tcr.isHidden ? '(Hidden)' : ''}`}
                  >
                    #{tcr.testCaseIndex} {tcr.passed ? '✓' : '✖'}
                  </div>
                ))}
              </div>

              {submissionResult.status === 'Accepted' && (
                <div style={{ marginTop: '1.25rem', padding: '0.65rem 0.85rem', background: '#dcfce7', borderRadius: 'var(--radius-sm)', color: '#15803d', fontSize: '0.85rem', fontWeight: 600 }}>
                  🎉 Great job! Your solution passed all sample and hidden edge cases. Your Placement Readiness Score has been updated.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodingProblemDetail;
