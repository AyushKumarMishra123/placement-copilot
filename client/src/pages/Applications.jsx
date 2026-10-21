import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { applicationAPI } from '../services/api';
import Alert from '../components/Alert';

const STATUS_TABS = ['All', 'Saved', 'Applied', 'Shortlisted', 'Interview', 'Offer', 'Rejected'];

const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [counts, setCounts] = useState({});
  const [activeTab, setActiveTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'kanban'

  // Edit Modal State
  const [editingApp, setEditingApp] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editFollowUp, setEditFollowUp] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadApplications();
  }, [activeTab]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const statusParam = activeTab === 'All' ? '' : activeTab;
      const res = await applicationAPI.getAll({ status: statusParam });
      setApplications(res.data.data?.applications || []);
      if (res.data.data?.counts) {
        setCounts(res.data.data.counts);
      }
    } catch (err) {
      setError('Failed to load application tracker.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appId, newStatus) => {
    try {
      await applicationAPI.update(appId, {
        status: newStatus,
        statusNote: `Updated to ${newStatus} via dashboard tracker`
      });
      setMessage(`Status updated to "${newStatus}".`);
      loadApplications();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleDelete = async (appId, company) => {
    if (!window.confirm(`Remove application for ${company} from your tracker?`)) return;
    try {
      await applicationAPI.delete(appId);
      setMessage(`Removed ${company} from tracker.`);
      loadApplications();
    } catch (err) {
      setError('Failed to remove tracker item.');
    }
  };

  const openEditModal = (app) => {
    setEditingApp(app);
    setEditStatus(app.status);
    setEditNotes(app.notes || '');
    setEditFollowUp(app.followUpDate ? app.followUpDate.split('T')[0] : '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await applicationAPI.update(editingApp._id, {
        status: editStatus,
        notes: editNotes,
        followUpDate: editFollowUp || null
      });
      setMessage('Application details updated successfully.');
      setEditingApp(null);
      loadApplications();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save changes.');
    } finally {
      setSavingEdit(false);
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

  // Find overdue or upcoming follow-ups
  const upcomingFollowUps = applications.filter((a) => {
    if (!a.followUpDate) return false;
    const diff = (new Date(a.followUpDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 7; // within 7 days or overdue
  });

  return (
    <div className="page-container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
              <span className="badge badge-info" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
                Application Pipeline
              </span>
              <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                Real-Time State Tracking
              </span>
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Placement Application Tracker
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
              Track submitted campus resumes, follow-up deadlines, interview rounds, and offers.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <button
                onClick={() => setViewMode('table')}
                className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: 0, border: 'none' }}
              >
                Table View
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`btn btn-sm ${viewMode === 'kanban' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: 0, border: 'none' }}
              >
                Kanban View
              </button>
            </div>

            <Link to="/jobs" className="btn btn-primary btn-sm">
              + Discover Jobs
            </Link>
          </div>
        </div>
      </header>

      {message && <Alert variant="success" message={message} onClose={() => setMessage('')} />}
      {error && <Alert variant="danger" message={error} onClose={() => setError('')} />}

      {/* Follow-Up Reminders Alert Banner */}
      {upcomingFollowUps.length > 0 && (
        <div
          className="card"
          style={{
            padding: '1rem 1.5rem',
            marginBottom: '1.5rem',
            background: 'rgba(234, 179, 8, 0.1)',
            borderLeft: '4px solid var(--warning)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <strong style={{ color: '#854d0e', fontSize: '0.92rem' }}>
              Follow-Up Action Required ({upcomingFollowUps.length}):
            </strong>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#713f12' }}>
              {upcomingFollowUps.map((u) => `${u.jobSnapshot?.company} (${new Date(u.followUpDate).toLocaleDateString()})`).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Status Tabs Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '1.5rem', paddingBottom: '0.25rem' }}>
        {STATUS_TABS.map((tab) => {
          const count = tab === 'All' ? counts.all || 0 : counts[tab] || 0;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                borderRadius: '20px',
                padding: '0.35rem 0.85rem',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              {tab}
              <span
                style={{
                  background: activeTab === tab ? 'rgba(255,255,255,0.3)' : 'var(--border-color)',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '10px',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
          <p>Loading application pipeline...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>No Applications in This Status</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', margin: '0.5rem auto 1.5rem' }}>
            Browse open campus placement drives and bookmark positions to track your hiring pipeline.
          </p>
          <Link to="/jobs" className="btn btn-primary btn-sm">
            Discover Job Postings &rarr;
          </Link>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="card" style={{ overflowX: 'auto', padding: '0.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Role & Company</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Applied / Saved</th>
                <th style={{ padding: '0.75rem 1rem' }}>Follow-Up</th>
                <th style={{ padding: '0.75rem 1rem' }}>Notes</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {app.jobSnapshot?.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {app.jobSnapshot?.company} &bull; {app.jobSnapshot?.location}
                    </div>
                  </td>

                  <td style={{ padding: '0.85rem 1rem' }}>
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app._id, e.target.value)}
                      className={`badge ${getStatusBadge(app.status)}`}
                      style={{ border: 'none', cursor: 'pointer', padding: '0.35rem 0.65rem' }}
                    >
                      <option value="Saved">Saved</option>
                      <option value="Applied">Applied</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Interview">Interview</option>
                      <option value="Offer">Offer</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </td>

                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {app.appliedAt
                      ? `Applied ${new Date(app.appliedAt).toLocaleDateString()}`
                      : `Saved ${new Date(app.savedAt || app.createdAt).toLocaleDateString()}`}
                  </td>

                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem' }}>
                    {app.followUpDate ? (
                      <span style={{ color: new Date(app.followUpDate) < new Date() ? 'var(--danger)' : 'var(--text-primary)', fontWeight: 600 }}>
                        {new Date(app.followUpDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>None set</span>
                    )}
                  </td>

                  <td style={{ padding: '0.85rem 1rem', maxWidth: '220px' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {app.notes || <em style={{ color: 'var(--text-muted)' }}>No notes</em>}
                    </p>
                  </td>

                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => openEditModal(app)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.78rem' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(app._id, app.jobSnapshot?.company)}
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
      ) : (
        /* Kanban View */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'flex-start' }}>
          {['Saved', 'Applied', 'Shortlisted', 'Interview', 'Offer', 'Rejected'].map((col) => {
            const colApps = applications.filter((a) => a.status === col);
            return (
              <div
                key={col}
                style={{
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  minHeight: '300px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <strong style={{ fontSize: '0.9rem' }}>{col}</strong>
                  <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                    {colApps.length}
                  </span>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {colApps.map((item) => (
                    <div
                      key={item._id}
                      className="card"
                      style={{ padding: '1rem', background: 'var(--bg-surface)' }}
                    >
                      <strong style={{ fontSize: '0.9rem', display: 'block', color: 'var(--text-primary)' }}>
                        {item.jobSnapshot?.title}
                      </strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {item.jobSnapshot?.company}
                      </span>

                      {item.notes && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
                          {item.notes}
                        </p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                        <button
                          onClick={() => openEditModal(item)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}
                        >
                          Edit
                        </button>
                        {item.jobSnapshot?.applyUrl && (
                          <a
                            href={item.jobSnapshot.applyUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: '0.75rem', color: 'var(--primary)', alignSelf: 'center' }}
                          >
                            Portal &rarr;
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Application Notes / Follow-up Modal */}
      {editingApp && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Update Application Details
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              {editingApp.jobSnapshot?.title} at {editingApp.jobSnapshot?.company}
            </p>

            <form onSubmit={handleSaveEdit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Status</label>
                <select
                  className="input"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem' }}
                >
                  <option value="Saved">Saved</option>
                  <option value="Applied">Applied</option>
                  <option value="Shortlisted">Shortlisted</option>
                  <option value="Interview">Interview</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Follow-Up Date</label>
                <input
                  type="date"
                  className="input"
                  value={editFollowUp}
                  onChange={(e) => setEditFollowUp(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Notes & Status History</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Record interview date, technical task submission, or recruiter communication..."
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingApp(null)}
                  className="btn btn-secondary"
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingEdit}
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Applications;
