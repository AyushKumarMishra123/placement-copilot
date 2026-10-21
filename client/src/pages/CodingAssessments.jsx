import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { codingAPI } from '../services/api';
import Alert from '../components/Alert';

const TOPICS = [
  'All',
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

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];

const CodingAssessments = () => {
  const [problems, setProblems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [search, setSearch] = useState('');

  const fetchProblems = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (selectedTopic !== 'All') params.topic = selectedTopic;
      if (selectedDifficulty !== 'All') params.difficulty = selectedDifficulty;
      if (search.trim()) params.search = search.trim();

      const [probRes, statsRes] = await Promise.all([
        codingAPI.getProblems(params),
        codingAPI.getStats()
      ]);

      setProblems(probRes.data.data.problems || []);
      setStats(statsRes.data.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load coding assessments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, [selectedTopic, selectedDifficulty]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProblems();
  };

  const getDifficultyBadge = (diff) => {
    const d = (diff || '').toLowerCase();
    if (d === 'easy') return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
    if (d === 'medium') return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
    return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' };
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header Banner */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--primary)' }}>
              Data Structures &amp; Algorithms Engine
            </span>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: '0.25rem 0 0.5rem', color: 'var(--text-primary)' }}>
              Coding Assessment Arena
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '650px', lineHeight: 1.5 }}>
              Solve original interview coding challenges with automated test suite validation. Verified solutions boost your <strong>Placement Readiness Score</strong> under the 10% coding assessment weight.
            </p>
          </div>

          <Link to="/readiness" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>
            View Readiness Impact ↗
          </Link>
        </div>
      </div>

      {/* Progress Cards */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}
        >
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Solved</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.2rem 0' }}>
              {stats.totalSolved} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {problems.length || 30}</span>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {stats.totalSubmissions || 0} total submissions
            </span>
          </div>

          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d' }}>Easy Problems</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803d', margin: '0.2rem 0' }}>
              {stats.difficultySolved?.Easy || 0}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Foundational DSA concepts</span>
          </div>

          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#b45309' }}>Medium Problems</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309', margin: '0.2rem 0' }}>
              {stats.difficultySolved?.Medium || 0}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Core placement interviews</span>
          </div>

          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#b91c1c' }}>Hard Problems</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b91c1c', margin: '0.2rem 0' }}>
              {stats.difficultySolved?.Hard || 0}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Tier-1 FAANG/FinTech bar</span>
          </div>
        </div>
      )}

      {error && <Alert type="error" message={error} style={{ marginBottom: '1.5rem' }} />}

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <input
            type="text"
            className="input"
            placeholder="Search problems by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '220px' }}
          />
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
          {search && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearch('');
                setSelectedTopic('All');
                setSelectedDifficulty('All');
              }}
            >
              Reset
            </button>
          )}
        </form>

        {/* Topic Pills */}
        <div style={{ marginBottom: '0.85rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '0.5rem' }}>
            Topic:
          </span>
          <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => setSelectedTopic(topic)}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  border: '1px solid',
                  borderColor: selectedTopic === topic ? 'var(--primary)' : 'var(--border)',
                  backgroundColor: selectedTopic === topic ? 'var(--primary)' : 'var(--surface)',
                  color: selectedTopic === topic ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: selectedTopic === topic ? 700 : 500,
                  transition: 'all 0.15s ease'
                }}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Filter */}
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '0.5rem' }}>
            Difficulty:
          </span>
          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
            {DIFFICULTIES.map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => setSelectedDifficulty(diff)}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid',
                  borderColor: selectedDifficulty === diff ? 'var(--primary)' : 'var(--border)',
                  backgroundColor: selectedDifficulty === diff ? 'var(--primary-light)' : 'transparent',
                  color: selectedDifficulty === diff ? 'var(--primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: selectedDifficulty === diff ? 700 : 500
                }}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Problems List */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
          <p>Loading coding challenges...</p>
        </div>
      ) : problems.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            No coding challenges found matching your filters.
          </p>
          <p style={{ fontSize: '0.85rem' }}>Try clearing your search term or selecting "All" topics.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: 'var(--text-secondary)', width: '60px' }}>
                  Status
                </th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Title &amp; Topic</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', width: '120px' }}>Difficulty</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', width: '120px' }}>Max Score</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: 'var(--text-secondary)', width: '140px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((prob, idx) => {
                const diffBadge = getDifficultyBadge(prob.difficulty);
                return (
                  <tr
                    key={prob._id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: prob.isSolved ? 'rgba(16, 185, 129, 0.03)' : 'transparent',
                      transition: 'background-color 0.1s'
                    }}
                  >
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                      {prob.isSolved ? (
                        <span
                          title="Solved"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            fontWeight: 800,
                            fontSize: '0.8rem'
                          }}
                        >
                          ✓
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>&bull;</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <Link
                        to={`/coding/${prob._id}`}
                        style={{
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          textDecoration: 'none',
                          fontSize: '0.95rem'
                        }}
                      >
                        {idx + 1}. {prob.title}
                      </Link>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {prob.topic}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.55rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: diffBadge.bg,
                          color: diffBadge.text,
                          border: `1px solid ${diffBadge.border}`,
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}
                      >
                        {prob.difficulty}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {prob.maxScore || 100} pts
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <Link
                        to={`/coding/${prob._id}`}
                        className={`btn btn-sm ${prob.isSolved ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ padding: '0.3rem 0.8rem', fontSize: '0.78rem' }}
                      >
                        {prob.isSolved ? 'Solve Again' : 'Solve'} ↗
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CodingAssessments;
