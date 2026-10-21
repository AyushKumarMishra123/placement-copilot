import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { adminCodingAPI } from '../../services/api';
import Alert from '../../components/Alert';

const TOPICS = [
  'Arrays & Strings',
  'Hashing',
  'Sorting & Searching',
  'Two Pointers',
  'Sliding Window',
  'Recursion',
  'Linked Lists',
  'Stacks & Queues',
  'Binary Trees',
  'Basic Graphs'
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const AdminCodingProblemForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [validationResult, setValidationResult] = useState(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [topic, setTopic] = useState('Arrays & Strings');
  const [difficulty, setDifficulty] = useState('Easy');
  const [maxScore, setMaxScore] = useState(100);
  const [timeLimitMs, setTimeLimitMs] = useState(2000);
  const [description, setDescription] = useState('');
  const [constraintsText, setConstraintsText] = useState('');
  const [hintsText, setHintsText] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [starterJs, setStarterJs] = useState('');
  const [starterPy, setStarterPy] = useState('');
  const [starterCpp, setStarterCpp] = useState('');
  const [starterJava, setStarterJava] = useState('');
  const [testCases, setTestCases] = useState([]);

  // New Test Case Modal / Form
  const [showAddTc, setShowAddTc] = useState(false);
  const [tcInput, setTcInput] = useState('');
  const [tcOutput, setTcOutput] = useState('');
  const [tcIsHidden, setTcIsHidden] = useState(false);
  const [tcIsEdgeCase, setTcIsEdgeCase] = useState(false);
  const [tcExplanation, setTcExplanation] = useState('');

  useEffect(() => {
    if (isEditing) {
      const fetchProblem = async () => {
        try {
          setLoading(true);
          setError('');
          const res = await adminCodingAPI.getById(id);
          const p = res.data.data.problem;
          setTitle(p.title || '');
          setSlug(p.slug || '');
          setTopic(p.topic || 'Arrays & Strings');
          setDifficulty(p.difficulty || 'Easy');
          setMaxScore(p.maxScore || 100);
          setTimeLimitMs(p.timeLimitMs || 2000);
          setDescription(p.description || '');
          setConstraintsText((p.constraints || []).join('\n'));
          setHintsText((p.hints || []).join('\n'));
          setReferenceCode(p.referenceSolution?.code || '');
          setStarterJs(p.starterCode?.javascript || '');
          setStarterPy(p.starterCode?.python || '');
          setStarterCpp(p.starterCode?.cpp || '');
          setStarterJava(p.starterCode?.java || '');
          setTestCases(p.testCases || []);
          setValidationResult(p.validationStatus || null);
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to fetch problem details.');
        } finally {
          setLoading(false);
        }
      };

      fetchProblem();
    }
  }, [id, isEditing]);

  const handleAddTestCase = (e) => {
    e.preventDefault();
    setTestCases([
      ...testCases,
      {
        input: tcInput,
        expectedOutput: tcOutput,
        isHidden: tcIsHidden,
        isEdgeCase: tcIsEdgeCase,
        explanation: tcExplanation
      }
    ]);
    setTcInput('');
    setTcOutput('');
    setTcIsHidden(false);
    setTcIsEdgeCase(false);
    setTcExplanation('');
    setShowAddTc(false);
    setValidationResult(null); // Invalidate previous run
  };

  const handleDeleteTestCase = (idx) => {
    setTestCases(testCases.filter((_, i) => i !== idx));
    setValidationResult(null);
  };

  const handleRunValidation = async () => {
    if (!referenceCode.trim()) {
      return setError('Please provide reference solution code to run validation.');
    }
    if (testCases.length === 0) {
      return setError('Please add at least one test case before running validation.');
    }

    try {
      setValidating(true);
      setError('');
      setSuccessMsg('');

      // If already saved, we can call the validate API
      if (isEditing) {
        // Save current code & test cases first
        await handleSave(false);
        const res = await adminCodingAPI.validate(id);
        const data = res.data.data;
        setValidationResult({
          isValidated: data.isValidated,
          passedCount: data.passedCount,
          totalCount: data.totalCount,
          errors: data.errors
        });
        if (data.isValidated) {
          setSuccessMsg(`Validation Passed! (${data.passedCount}/${data.totalCount} tests passed)`);
        } else {
          setError(`Validation Failed: ${data.errors?.[0] || 'Outputs did not match'}`);
        }
      } else {
        // For new problem, suggest saving as draft first
        setError('Please save the problem as draft first, then run validation.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Validation execution failed.');
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async (redirectOnSuccess = true) => {
    if (!title.trim() || !description.trim()) {
      return setError('Title and description are required.');
    }

    try {
      setSaving(true);
      setError('');
      setSuccessMsg('');

      const payload = {
        title,
        slug: slug.trim() || undefined,
        topic,
        difficulty,
        maxScore: Number(maxScore),
        timeLimitMs: Number(timeLimitMs),
        description,
        constraints: constraintsText.split('\n').map((c) => c.trim()).filter(Boolean),
        hints: hintsText.split('\n').map((h) => h.trim()).filter(Boolean),
        starterCode: {
          javascript: starterJs,
          python: starterPy,
          cpp: starterCpp,
          java: starterJava
        },
        referenceSolution: {
          language: 'javascript',
          code: referenceCode
        },
        testCases
      };

      if (isEditing) {
        await adminCodingAPI.update(id, payload);
        setSuccessMsg('Problem updated successfully.');
        if (redirectOnSuccess) {
          navigate('/admin/coding');
        }
      } else {
        const res = await adminCodingAPI.create(payload);
        const newProb = res.data.data.problem;
        setSuccessMsg('Problem created as Draft.');
        if (redirectOnSuccess) {
          navigate(`/admin/coding/${newProb._id}/edit`);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save problem.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        <p>Loading problem form...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Top Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <Link to="/admin/coding" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem' }}>
            &larr; Back to Problem Management
          </Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.2rem 0', color: 'var(--text-primary)' }}>
            {isEditing ? `Edit: ${title}` : 'Create New Coding Problem'}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {isEditing && (
            <button
              onClick={handleRunValidation}
              disabled={validating || saving}
              className="btn btn-secondary"
              style={{ fontWeight: 600 }}
            >
              {validating ? 'Running Validation...' : '🧪 Validate Test Suite'}
            </button>
          )}

          <button
            onClick={() => handleSave(true)}
            disabled={saving || validating}
            className="btn btn-primary"
            style={{ fontWeight: 700 }}
          >
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Problem (Draft)'}
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} style={{ marginBottom: '1rem' }} />}
      {successMsg && <Alert type="success" message={successMsg} style={{ marginBottom: '1rem' }} />}

      {/* Validation Status Banner */}
      {validationResult && (
        <div
          className="card"
          style={{
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            borderLeft: validationResult.isValidated ? '5px solid #10b981' : '5px solid #ef4444',
            backgroundColor: validationResult.isValidated ? '#f0fdf4' : '#fef2f2'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ color: validationResult.isValidated ? '#15803d' : '#991b1b', fontSize: '0.95rem' }}>
                {validationResult.isValidated ? '✓ Reference Solution Validated' : '✖ Validation Incomplete / Failed'}
              </strong>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {validationResult.passedCount} / {validationResult.totalCount} test cases passed.
              </div>
            </div>

            {validationResult.isValidated ? (
              <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                Eligible for Activation
              </span>
            ) : (
              <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', background: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}>
                Draft Only (Excluded from Students)
              </span>
            )}
          </div>

          {validationResult.errors?.length > 0 && (
            <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#fee2e2', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: '#991b1b', fontFamily: 'monospace' }}>
              {validationResult.errors.map((err, i) => (
                <div key={i}>&bull; {err}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Core Problem Data */}
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Problem Overview</h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Problem Title *
              </label>
              <input
                type="text"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Reverse Singly Linked List"
                style={{ width: '100%' }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Topic *
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                >
                  {TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Difficulty *
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Max Score
                </label>
                <input
                  type="number"
                  className="input"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Time Limit (ms)
                </label>
                <input
                  type="number"
                  className="input"
                  value={timeLimitMs}
                  onChange={(e) => setTimeLimitMs(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Problem Statement (Markdown / Text) *
              </label>
              <textarea
                className="input"
                rows={8}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the problem, input format, output format, and rules..."
                style={{ width: '100%', fontFamily: 'inherit', fontSize: '0.85rem' }}
                required
              />
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Constraints &amp; Hints</h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Constraints (One per line)
              </label>
              <textarea
                className="input"
                rows={3}
                value={constraintsText}
                onChange={(e) => setConstraintsText(e.target.value)}
                placeholder="1 <= n <= 10^5&#10;-10^4 <= arr[i] <= 10^4"
                style={{ width: '100%', fontSize: '0.82rem', fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Hints (One per line)
              </label>
              <textarea
                className="input"
                rows={3}
                value={hintsText}
                onChange={(e) => setHintsText(e.target.value)}
                placeholder="Use two pointers from both ends...&#10;Sort the array first to find pairs..."
                style={{ width: '100%', fontSize: '0.82rem' }}
              />
            </div>
          </div>

          {/* Reference Solution (Admin Only) */}
          <div className="card" style={{ padding: '1.25rem', border: '1px solid #fed7aa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#9a3412' }}>
                  Trusted Reference Solution (JavaScript)
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#c2410c' }}>
                  🔒 Admin-only. Used by the validation pipeline to verify test suite outputs.
                </span>
              </div>
            </div>

            <textarea
              className="input"
              rows={12}
              value={referenceCode}
              onChange={(e) => {
                setReferenceCode(e.target.value);
                setValidationResult(null);
              }}
              placeholder="// Write reference solution code using readline() or readAll()..."
              style={{
                width: '100%',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                padding: '0.75rem'
              }}
              spellCheck="false"
            />
          </div>
        </div>

        {/* Right Column: Test Cases Management */}
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                  Test Cases ({testCases.length})
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {testCases.filter((tc) => !tc.isHidden).length} Sample / {testCases.filter((tc) => tc.isHidden).length} Hidden
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowAddTc(true)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.78rem' }}
              >
                + Add Test Case
              </button>
            </div>

            {/* Test Cases List */}
            {testCases.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                No test cases configured yet. Add at least 1 sample and 2 hidden edge cases.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '0.65rem', maxHeight: '500px', overflowY: 'auto' }}>
                {testCases.map((tc, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <strong>Test #{idx + 1}</strong>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            padding: '0.1rem 0.35rem',
                            borderRadius: 'var(--radius-sm)',
                            background: tc.isHidden ? '#fee2e2' : '#dcfce7',
                            color: tc.isHidden ? '#b91c1c' : '#15803d',
                            fontWeight: 700
                          }}
                        >
                          {tc.isHidden ? 'Hidden' : 'Sample'}
                        </span>
                        {tc.isEdgeCase && (
                          <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-sm)', background: '#fef3c7', color: '#b45309' }}>
                            Edge Case
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteTestCase(idx)}
                        style={{ border: 'none', background: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Remove
                      </button>
                    </div>

                    <div style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      <div>
                        <strong>In:</strong> {tc.input.length > 40 ? tc.input.slice(0, 40) + '...' : tc.input}
                      </div>
                      <div>
                        <strong>Out:</strong> {tc.expectedOutput.length > 40 ? tc.expectedOutput.slice(0, 40) + '...' : tc.expectedOutput}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Test Case Form Modal / Collapse */}
          {showAddTc && (
            <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--primary)' }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.75rem' }}>Add New Test Case</h4>

              <div style={{ marginBottom: '0.65rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                  Input (stdin)
                </label>
                <textarea
                  className="input"
                  rows={2}
                  value={tcInput}
                  onChange={(e) => setTcInput(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8rem', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ marginBottom: '0.65rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                  Expected Output (stdout)
                </label>
                <textarea
                  className="input"
                  rows={2}
                  value={tcOutput}
                  onChange={(e) => setTcOutput(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8rem', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.65rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={tcIsHidden}
                    onChange={(e) => setTcIsHidden(e.target.checked)}
                  />
                  Hidden Test Case (Admin/Judge Only)
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={tcIsEdgeCase}
                    onChange={(e) => setTcIsEdgeCase(e.target.checked)}
                  />
                  Boundary / Edge Case
                </label>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                  Explanation (Shown on sample tests)
                </label>
                <input
                  type="text"
                  className="input"
                  value={tcExplanation}
                  onChange={(e) => setTcExplanation(e.target.value)}
                  placeholder="e.g. Empty list returns EMPTY"
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddTc(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddTestCase}
                  className="btn btn-primary btn-sm"
                >
                  Add Test
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCodingProblemForm;
