import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminCodingAPI } from '../../services/api';
import Alert from '../../components/Alert';

const AdminCodingProblems = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [validatingId, setValidatingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedErrorProblem, setSelectedErrorProblem] = useState(null);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterDifficulty !== 'all') params.difficulty = filterDifficulty;
      if (search.trim()) params.search = search.trim();

      const res = await adminCodingAPI.getProblems(params);
      setProblems(res.data.data.problems || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch coding problems.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, [filterStatus, filterDifficulty]);

  const handleValidate = async (id) => {
    try {
      setValidatingId(id);
      setError('');
      setActionMsg('');
      const res = await adminCodingAPI.validate(id);
      const data = res.data.data;

      if (data.isValidated) {
        setActionMsg(`✅ Reference solution validated successfully! (${data.passedCount}/${data.totalCount} tests passed)`);
      } else {
        setError(`⚠️ Validation failed: ${data.errors?.[0] || 'Some test cases did not match expected output.'}`);
      }

      fetchProblems();
    } catch (err) {
      setError(err.response?.data?.message || 'Validation execution failed.');
    } finally {
      setValidatingId(null);
    }
  };

  const handleToggleStatus = async (prob) => {
    try {
      setError('');
      setActionMsg('');
      const newStatus = !prob.isActive;

      if (newStatus && !prob.validationStatus?.isValidated) {
        return setError('Cannot activate: Problem reference solution must be validated against all test cases first.');
      }

      await adminCodingAPI.toggleStatus(prob._id, newStatus);
      setActionMsg(`Problem "${prob.title}" is now ${newStatus ? 'ACTIVE' : 'DEACTIVATED'}.`);
      fetchProblems();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update problem status.');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete problem "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await adminCodingAPI.delete(id);
      setActionMsg(`Problem "${title}" deleted.`);
      fetchProblems();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete problem.');
    }
  };

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: '#d97706' }}>
            Administrator Workspace
          </span>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0.2rem 0', color: 'var(--text-primary)' }}>
            Coding Assessment Problem Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '650px' }}>
            Author, edit, and validate coding challenges and test suites. Only problems with validated reference solutions can be activated for student placement assessments.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/admin/coding/new" className="btn btn-primary" style={{ fontWeight: 700 }}>
            + Create New Problem
          </Link>
          <Link to="/admin/jobs" className="btn btn-secondary">
            Job Board ↗
          </Link>
        </div>
      </div>

      {error && <Alert type="error" message={error} style={{ marginBottom: '1rem' }} />}
      {actionMsg && <Alert type="success" message={actionMsg} style={{ marginBottom: '1rem' }} />}

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          className="input"
          placeholder="Filter by title or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchProblems()}
          style={{ flex: 1, minWidth: '220px' }}
        />

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input"
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.82rem' }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="draft">Draft Only</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Difficulty:</label>
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="input"
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.82rem' }}
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <button onClick={fetchProblems} className="btn btn-secondary btn-sm">
          Refresh
        </button>
      </div>

      {/* Problems Table */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
          <p>Loading problems...</p>
        </div>
      ) : problems.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '1rem', fontWeight: 600 }}>No coding problems found.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '0.8rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Problem</th>
                <th style={{ padding: '0.8rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Topic</th>
                <th style={{ padding: '0.8rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Difficulty</th>
                <th style={{ padding: '0.8rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Validation Status</th>
                <th style={{ padding: '0.8rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>State</th>
                <th style={{ padding: '0.8rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((prob) => {
                const isValidated = prob.validationStatus?.isValidated;
                const hasErrors = prob.validationStatus?.errors?.length > 0;

                return (
                  <tr key={prob._id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <strong style={{ color: 'var(--text-primary)', display: 'block' }}>{prob.title}</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {prob.slug}
                      </span>
                    </td>
                    <td style={{ padding: '0.9rem 1rem', color: 'var(--text-secondary)' }}>{prob.topic}</td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.45rem',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 700,
                          backgroundColor:
                            prob.difficulty === 'Easy'
                              ? '#dcfce7'
                              : prob.difficulty === 'Medium'
                              ? '#fef3c7'
                              : '#fee2e2',
                          color:
                            prob.difficulty === 'Easy'
                              ? '#15803d'
                              : prob.difficulty === 'Medium'
                              ? '#b45309'
                              : '#b91c1c'
                        }}
                      >
                        {prob.difficulty}
                      </span>
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      {isValidated ? (
                        <span style={{ color: '#15803d', fontWeight: 700, fontSize: '0.8rem' }}>
                          ✓ Validated ({prob.validationStatus?.passedCount}/{prob.validationStatus?.totalCount})
                        </span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ color: '#b91c1c', fontWeight: 700, fontSize: '0.8rem' }}>
                            ✖ Draft ({prob.validationStatus?.passedCount || 0}/{prob.validationStatus?.totalCount || 0})
                          </span>
                          {hasErrors && (
                            <button
                              onClick={() => setSelectedErrorProblem(prob)}
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.1rem 0.35rem',
                                background: '#fee2e2',
                                border: '1px solid #fecaca',
                                color: '#b91c1c',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer'
                              }}
                            >
                              View Errors
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.45rem',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 700,
                          backgroundColor: prob.isActive ? '#dcfce7' : '#f1f5f9',
                          color: prob.isActive ? '#15803d' : '#64748b'
                        }}
                      >
                        {prob.isActive ? 'Active' : 'Draft'}
                      </span>
                    </td>
                    <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <button
                          onClick={() => handleValidate(prob._id)}
                          disabled={validatingId === prob._id}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.74rem' }}
                          title="Run reference solution validation against all test cases"
                        >
                          {validatingId === prob._id ? 'Validating...' : 'Validate'}
                        </button>

                        <button
                          onClick={() => handleToggleStatus(prob)}
                          className={`btn btn-sm ${prob.isActive ? 'btn-secondary' : 'btn-primary'}`}
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.74rem' }}
                        >
                          {prob.isActive ? 'Deactivate' : 'Activate'}
                        </button>

                        <Link
                          to={`/admin/coding/${prob._id}/edit`}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.74rem' }}
                        >
                          Edit
                        </Link>

                        <button
                          onClick={() => handleDelete(prob._id, prob.title)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.74rem', color: '#b91c1c' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Validation Errors Modal */}
      {selectedErrorProblem && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 1000
          }}
          onClick={() => setSelectedErrorProblem(null)}
        >
          <div
            className="card"
            style={{ maxWidth: '600px', width: '100%', padding: '1.75rem', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem', color: '#b91c1c' }}>
              Validation Errors: {selectedErrorProblem.title}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              The reference solution failed verification against the test suite. Review the discrepancies below:
            </p>

            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
              {(selectedErrorProblem.validationStatus?.errors || []).map((err, i) => (
                <div key={i} style={{ fontSize: '0.8rem', color: '#991b1b', marginBottom: '0.5rem', fontFamily: 'monospace' }}>
                  &bull; {err}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <Link to={`/admin/coding/${selectedErrorProblem._id}/edit`} className="btn btn-primary btn-sm">
                Edit Problem &amp; Test Cases
              </Link>
              <button onClick={() => setSelectedErrorProblem(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCodingProblems;
