import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminJobAPI } from '../../services/api';
import Alert from '../../components/Alert';

const AdminApplicants = () => {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadApplicants();
  }, [jobId]);

  const loadApplicants = async () => {
    setLoading(true);
    try {
      const res = await adminJobAPI.getApplicants(jobId);
      setJob(res.data.data?.job);
      setApplicants(res.data.data?.applicants || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load applicants for this job.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (applicationId, newStatus) => {
    setUpdatingId(applicationId);
    setMessage('');
    setError('');

    try {
      await adminJobAPI.updateApplicantStatus(jobId, applicationId, {
        status: newStatus,
        note: `Status updated to ${newStatus} by campus administrator`
      });

      setMessage(`Candidate status updated to "${newStatus}".`);
      loadApplicants();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update candidate status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Offer':
        return 'badge-success';
      case 'Interview':
        return 'badge-primary';
      case 'Shortlisted':
        return 'badge-info';
      case 'Applied':
        return 'badge-warning';
      case 'Rejected':
        return 'badge-danger';
      default:
        return 'badge-neutral';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        <p>Loading candidate applicants...</p>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <Link to="/admin/jobs" style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          &larr; Back to Admin Postings
        </Link>
      </div>

      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
              <span className="badge badge-warning" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
                Applicant Review
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {job?.company}
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Candidates for: {job?.title}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.25rem' }}>
              Review registered campus applicants, track recruitment progression, and assign interview or offer statuses.
            </p>
          </div>

          <span className="badge badge-neutral" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
            {applicants.length} Total Applicants
          </span>
        </div>
      </header>

      {message && <Alert variant="success" message={message} onClose={() => setMessage('')} />}
      {error && <Alert variant="danger" message={error} onClose={() => setError('')} />}

      {applicants.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>No Student Applicants Yet</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', margin: '0.5rem auto 1.5rem' }}>
            Students discovering this listing will appear here when they submit or track their application.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: '0.5rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Candidate</th>
                <th style={{ padding: '0.75rem 1rem' }}>Registered Email</th>
                <th style={{ padding: '0.75rem 1rem' }}>Application Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Current Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Candidate Notes</th>
              </tr>
            </thead>
            <tbody>
              {applicants.map((app) => (
                <tr key={app.applicationId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {app.studentName}
                    </strong>
                  </td>

                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                    {app.studentEmail}
                  </td>

                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {new Date(app.appliedAt).toLocaleDateString()}
                  </td>

                  <td style={{ padding: '0.85rem 1rem' }}>
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.applicationId, e.target.value)}
                      disabled={updatingId === app.applicationId}
                      className={`badge ${getStatusBadge(app.status)}`}
                      style={{ border: 'none', cursor: 'pointer', padding: '0.35rem 0.65rem', fontSize: '0.82rem' }}
                    >
                      <option value="Saved">Saved</option>
                      <option value="Applied">Applied</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Interview">Interview</option>
                      <option value="Offer">Offer</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </td>

                  <td style={{ padding: '0.85rem 1rem', maxWidth: '240px' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {app.notes || <em style={{ color: 'var(--text-muted)' }}>No candidate notes</em>}
                    </p>
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

export default AdminApplicants;
