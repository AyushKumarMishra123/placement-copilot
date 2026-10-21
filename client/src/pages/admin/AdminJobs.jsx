import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminJobAPI } from '../../services/api';
import Alert from '../../components/Alert';

const AdminJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await adminJobAPI.getAll();
      setJobs(res.data.data?.jobs || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load administered jobs.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async (jobId) => {
    try {
      const res = await adminJobAPI.togglePublish(jobId);
      setMessage(res.data.message || 'Job status updated.');
      loadJobs();
    } catch (err) {
      setError('Failed to update job status.');
    }
  };

  const handleDelete = async (jobId, title) => {
    if (!window.confirm(`Permanently remove job "${title}"?`)) return;
    try {
      await adminJobAPI.delete(jobId);
      setMessage(`Removed job "${title}".`);
      loadJobs();
    } catch (err) {
      setError('Failed to delete job.');
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
              <span className="badge badge-warning" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
                Administrator Portal
              </span>
              <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                MSOT Job Board Management
              </span>
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Campus Placement Admin Board
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
              Create, publish, edit verified recruitment drives and inspect student applications.
            </p>
          </div>

          <Link to="/admin/jobs/new" className="btn btn-primary">
            + Post New Opening
          </Link>
        </div>
      </header>

      {message && <Alert variant="success" message={message} onClose={() => setMessage('')} />}
      {error && <Alert variant="danger" message={error} onClose={() => setError('')} />}

      {loading ? (
        <div className="loading-container">
          <div className="spinner" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
          <p>Loading administered job drives...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>No Jobs Posted Yet</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', margin: '0.5rem auto 1.5rem' }}>
            Publish your first verified campus placement opening or internship for registered students.
          </p>
          <Link to="/admin/jobs/new" className="btn btn-primary">
            Create Placement Posting &rarr;
          </Link>
        </div>
      ) : (
        <div className="card" style={{ padding: '0.5rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Job Title & Company</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Applicants</th>
                <th style={{ padding: '0.75rem 1rem' }}>Location / Type</th>
                <th style={{ padding: '0.75rem 1rem' }}>Published</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Management</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary)', display: 'block' }}>
                      {job.title}
                    </strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {job.company}
                    </span>
                  </td>

                  <td style={{ padding: '0.85rem 1rem' }}>
                    <button
                      onClick={() => handleTogglePublish(job._id)}
                      className={`badge ${job.isActive ? 'badge-success' : 'badge-neutral'}`}
                      style={{ border: 'none', cursor: 'pointer', padding: '0.35rem 0.65rem' }}
                      title="Click to toggle publish status"
                    >
                      {job.isActive ? 'Active \u2713' : 'Draft / Closed'}
                    </button>
                  </td>

                  <td style={{ padding: '0.85rem 1rem' }}>
                    <Link
                      to={`/admin/jobs/${job._id}/applicants`}
                      className="badge badge-info"
                      style={{ textDecoration: 'none', fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
                    >
                      {job.applicantCount || 0} Students &rarr;
                    </Link>
                  </td>

                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    {job.location} ({job.workplaceType})
                  </td>

                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {new Date(job.createdAt).toLocaleDateString()}
                  </td>

                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <Link to={`/admin/jobs/${job._id}/edit`} className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem' }}>
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(job._id, job.title)}
                        className="btn btn-danger btn-sm"
                        style={{ fontSize: '0.78rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminJobs;
