import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectAPI } from '../services/api';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    techStack: '',
    githubUrl: '',
    liveUrl: ''
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await projectAPI.getProjects();
      setProjects(res.data.data?.projects || []);
    } catch (err) {
      setError('Failed to load portfolio projects.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      description: '',
      techStack: '',
      githubUrl: '',
      liveUrl: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (proj) => {
    setEditingProject(proj);
    setFormData({
      name: proj.name || '',
      description: proj.description || '',
      techStack: Array.isArray(proj.techStack) ? proj.techStack.join(', ') : '',
      githubUrl: proj.githubUrl || '',
      liveUrl: proj.liveUrl || ''
    });
    setShowModal(true);
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        techStack: formData.techStack.split(',').map((s) => s.trim()).filter(Boolean),
        githubUrl: formData.githubUrl.trim(),
        liveUrl: formData.liveUrl.trim()
      };

      if (editingProject) {
        await projectAPI.updateProject(editingProject._id, payload);
      } else {
        await projectAPI.addProject(payload);
      }

      setShowModal(false);
      loadProjects();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not save project.');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project? All associated review snapshots will also be removed.')) {
      return;
    }
    try {
      await projectAPI.deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p._id !== projectId));
    } catch (err) {
      alert('Failed to delete project.');
    }
  };

  const handleAnalyze = async (projectId) => {
    setActionLoading((prev) => ({ ...prev, [projectId]: 'analyzing' }));
    try {
      await projectAPI.analyzeProject(projectId);
      loadProjects();
    } catch (err) {
      alert(err.response?.data?.message || 'Repository analysis failed. Please verify the GitHub URL is public.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [projectId]: null }));
    }
  };

  const handleCheckLiveLink = async (projectId) => {
    setActionLoading((prev) => ({ ...prev, [projectId]: 'checking-live' }));
    try {
      const res = await projectAPI.checkLiveLink(projectId);
      const data = res.data.data?.liveCheck;
      alert(`Live Check Complete: ${data?.reachable ? 'Reachable (Status ' + data.finalStatus + ')' : 'Unreachable: ' + (data?.error || 'Unknown error')}`);
      loadProjects();
    } catch (err) {
      alert(err.response?.data?.message || 'Live link check failed.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [projectId]: null }));
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Project & Source-Code Intelligence
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Inspect repository structure, verify live deployments via Playwright, detect committed secrets, and review README clarity.
          </p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add New Project
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading your projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem', textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }}>
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>No Projects Added Yet</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0.5rem auto 1.5rem' }}>
            Add your key software projects with their public GitHub repository and live deployment URLs to evaluate their placement readiness.
          </p>
          <button onClick={handleOpenAdd} className="btn btn-primary">
            Add Your First Project
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {projects.map((proj) => (
            <div key={proj._id} className="card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      {proj.name}
                    </h2>
                    {proj.githubUrl && (
                      <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                        GitHub Linked
                      </span>
                    )}
                    {proj.liveUrl && (
                      <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                        Live URL
                      </span>
                    )}
                  </div>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', marginTop: '0.5rem', maxWidth: '700px' }}>
                    {proj.description || <em style={{ color: 'var(--text-muted)' }}>No description provided.</em>}
                  </p>

                  {/* Tech Stack Pills */}
                  {Array.isArray(proj.techStack) && proj.techStack.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                      {proj.techStack.map((tech, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.55rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-subtle)',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* URL Links */}
                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '0.85rem', fontSize: '0.85rem' }}>
                    {proj.githubUrl ? (
                      <a href={proj.githubUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                        </svg>
                        {proj.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//i, '')}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>No GitHub URL configured</span>
                    )}

                    {proj.liveUrl && (
                      <a href={proj.liveUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--success)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="2" y1="12" x2="22" y2="12" />
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                        Live Website
                      </a>
                    )}
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', minWidth: '180px' }}>
                  <button
                    onClick={() => handleAnalyze(proj._id)}
                    className="btn btn-primary btn-sm"
                    disabled={!proj.githubUrl || Boolean(actionLoading[proj._id])}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    {actionLoading[proj._id] === 'analyzing' ? (
                      <>
                        <span className="spinner" style={{ width: '12px', height: '12px' }} />
                        Inspecting Code...
                      </>
                    ) : (
                      'Analyze Code & Repo'
                    )}
                  </button>

                  {proj.liveUrl && (
                    <button
                      onClick={() => handleCheckLiveLink(proj._id)}
                      className="btn btn-secondary btn-sm"
                      disabled={Boolean(actionLoading[proj._id])}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                    >
                      {actionLoading[proj._id] === 'checking-live' ? (
                        <>
                          <span className="spinner" style={{ width: '12px', height: '12px' }} />
                          Testing Browser...
                        </>
                      ) : (
                        'Verify Live URL'
                      )}
                    </button>
                  )}

                  <Link
                    to={`/projects/${proj._id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ textAlign: 'center' }}
                  >
                    View Report & History
                  </Link>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button onClick={() => handleOpenEdit(proj)} className="btn btn-sm" style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                      Edit
                    </button>
                    <button onClick={() => handleDeleteProject(proj._id)} className="btn btn-sm btn-danger" style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000
          }}
        >
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              {editingProject ? 'Edit Project' : 'Add New Portfolio Project'}
            </h2>

            <form onSubmit={handleSaveProject} style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Project Name *
                </label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. Placement Readiness Copilot"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Description
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Summarize the problem solved, architecture, and core features..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Tech Stack (comma-separated)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. React, Node.js, Express, MongoDB, Playwright"
                  value={formData.techStack}
                  onChange={(e) => setFormData({ ...formData, techStack: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Public GitHub Repository URL
                </label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://github.com/username/project-repo"
                  value={formData.githubUrl}
                  onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Live Deployment Website URL (Optional)
                </label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://my-app.vercel.app"
                  value={formData.liveUrl}
                  onChange={(e) => setFormData({ ...formData, liveUrl: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
