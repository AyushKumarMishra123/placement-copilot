import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import { profileAPI } from '../services/api';
import Alert from '../components/Alert';

const Profile = () => {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    targetRole: '',
    location: '',
    skills: '',
    education: '',
    github: '',
    linkedin: '',
    leetcode: '',
    achievements: '',
    projects: []
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await profileAPI.get();
      const profile = res.data.data.profile;

      if (profile) {
        setFormData({
          targetRole: profile.targetRole || '',
          location: profile.location || '',
          skills: Array.isArray(profile.skills) ? profile.skills.join(', ') : profile.skills || '',
          education: profile.education || '',
          github: profile.github || '',
          linkedin: profile.linkedin || '',
          leetcode: profile.leetcode || '',
          achievements: Array.isArray(profile.achievements)
            ? profile.achievements.join('\n')
            : profile.achievements || '',
          projects: Array.isArray(profile.projects) ? profile.projects : []
        });
      }
    } catch (err) {
      setErrorMsg('Failed to load profile. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddProject = () => {
    setFormData((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        {
          name: '',
          description: '',
          techStack: '',
          githubUrl: '',
          liveUrl: ''
        }
      ]
    }));
  };

  const handleRemoveProject = (index) => {
    setFormData((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index)
    }));
  };

  const handleProjectChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedProjects = [...prev.projects];
      updatedProjects[index] = {
        ...updatedProjects[index],
        [field]: value
      };
      return {
        ...prev,
        projects: updatedProjects
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      // Process payload
      const payload = {
        targetRole: formData.targetRole.trim(),
        location: formData.location.trim(),
        skills: formData.skills
          ? formData.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        education: formData.education.trim(),
        github: formData.github.trim(),
        linkedin: formData.linkedin.trim(),
        leetcode: formData.leetcode.trim(),
        achievements: formData.achievements
          ? formData.achievements.split('\n').map((s) => s.trim()).filter(Boolean)
          : [],
        projects: formData.projects.map((p) => ({
          name: p.name.trim(),
          description: p.description?.trim() || '',
          techStack: Array.isArray(p.techStack)
            ? p.techStack
            : (p.techStack || '').split(',').map((s) => s.trim()).filter(Boolean),
          githubUrl: p.githubUrl?.trim() || '',
          liveUrl: p.liveUrl?.trim() || ''
        }))
      };

      const res = await profileAPI.update(payload);
      const savedProfile = res.data.data.profile;

      // Update state with confirmed persisted data
      setFormData({
        targetRole: savedProfile.targetRole || '',
        location: savedProfile.location || '',
        skills: Array.isArray(savedProfile.skills) ? savedProfile.skills.join(', ') : '',
        education: savedProfile.education || '',
        github: savedProfile.github || '',
        linkedin: savedProfile.linkedin || '',
        leetcode: savedProfile.leetcode || '',
        achievements: Array.isArray(savedProfile.achievements)
          ? savedProfile.achievements.join('\n')
          : '',
        projects: Array.isArray(savedProfile.projects) ? savedProfile.projects : []
      });

      setSuccessMsg('Profile updated and saved to MongoDB successfully!');
    } catch (err) {
      const message =
        err.response?.data?.message || err.response?.data?.errors?.[0] || 'Failed to save profile.';
      setErrorMsg(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete your profile and all stored data? This cannot be undone.'
    );
    if (!confirmed) return;

    setDeleting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await profileAPI.delete();
      setFormData({
        targetRole: '',
        location: '',
        skills: '',
        education: '',
        github: '',
        linkedin: '',
        leetcode: '',
        achievements: '',
        projects: []
      });
      setSuccessMsg('Your profile and stored data have been permanently deleted from MongoDB.');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete profile.');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await profileAPI.exportData();
      const exportJson = JSON.stringify(res.data.data, null, 2);
      const blob = new Blob([exportJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `candidate_profile_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSuccessMsg('Your personal data archive was downloaded successfully.');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to export candidate data.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'CRITICAL WARNING: This will permanently delete your entire user account, credentials, uploaded files, and all historical assessments from MongoDB. This action CANNOT be undone. Proceed?'
    );
    if (!confirmed) return;

    setDeleting(true);
    setErrorMsg('');
    try {
      await profileAPI.deleteAccount();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/register';
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete account.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        <p>Loading candidate profile...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Candidate Profile
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Manage your verified academic background, skills, projects, and external profiles.
        </p>
      </div>

      <Alert variant="success" message={successMsg} onClose={() => setSuccessMsg('')} />
      <Alert variant="danger" message={errorMsg} onClose={() => setErrorMsg('')} />

      <form onSubmit={handleSubmit}>
        {/* Core Career Profile */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Professional Details</h2>
              <p className="card-subtitle">Define your target career domain and current location</p>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="user-name">
                Full Name (Account)
              </label>
              <input
                id="user-name"
                type="text"
                className="form-input"
                value={user?.name || ''}
                disabled
                style={{ backgroundColor: 'var(--bg-subtle)' }}
              />
              <span className="form-hint">Set at account creation</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="user-email">
                Registered Email
              </label>
              <input
                id="user-email"
                type="email"
                className="form-input"
                value={user?.email || ''}
                disabled
                style={{ backgroundColor: 'var(--bg-subtle)' }}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="target-role">
                Target Role / Specialization
              </label>
              <input
                id="target-role"
                name="targetRole"
                type="text"
                className="form-input"
                placeholder="e.g. SDE 1, Frontend Engineer, Data Analyst"
                value={formData.targetRole}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="location">
                Preferred Location
              </label>
              <input
                id="location"
                name="location"
                type="text"
                className="form-input"
                placeholder="e.g. Bangalore, Remote, Pune"
                value={formData.location}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="skills">
              Key Technical Skills (Comma separated)
            </label>
            <input
              id="skills"
              name="skills"
              type="text"
              className="form-input"
              placeholder="e.g. JavaScript, React, Node.js, Express, MongoDB, Python, DSA"
              value={formData.skills}
              onChange={handleChange}
            />
            <span className="form-hint">Separate individual technologies with a comma</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="education">
              Education & Degrees
            </label>
            <input
              id="education"
              name="education"
              type="text"
              className="form-input"
              placeholder="e.g. B.Tech Computer Science & Engineering, 2021-2025 (CGPA: 8.7)"
              value={formData.education}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* External Profiles */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Coding & Professional Handles</h2>
              <p className="card-subtitle">Links to verify code activity and professional experience</p>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="github">
                GitHub Profile URL
              </label>
              <input
                id="github"
                name="github"
                type="url"
                className="form-input"
                placeholder="https://github.com/username"
                value={formData.github}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="linkedin">
                LinkedIn Profile URL
              </label>
              <input
                id="linkedin"
                name="linkedin"
                type="url"
                className="form-input"
                placeholder="https://linkedin.com/in/username"
                value={formData.linkedin}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="leetcode">
                LeetCode / Competitive Programming Handle
              </label>
              <input
                id="leetcode"
                name="leetcode"
                type="text"
                className="form-input"
                placeholder="https://leetcode.com/username or handle"
                value={formData.leetcode}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="achievements">
                Key Honors & Achievements (One per line)
              </label>
              <textarea
                id="achievements"
                name="achievements"
                className="form-textarea"
                placeholder="Dean's List 2024&#10;Smart India Hackathon Finalist&#10;Top 5% in CodeChef Global Challenge"
                value={formData.achievements}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Projects & Live Work</h2>
              <p className="card-subtitle">Showcase software products, architectures and deployed URLs</p>
            </div>
            <button
              type="button"
              onClick={handleAddProject}
              className="btn btn-secondary btn-sm"
            >
              + Add Project
            </button>
          </div>

          {formData.projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No projects added yet. Click <strong>+ Add Project</strong> above to highlight your work.
            </div>
          ) : (
            formData.projects.map((project, index) => (
              <div key={index} className="project-item-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    Project #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveProject(index)}
                    className="btn btn-danger btn-sm"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">
                      Project Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Distributed Task Scheduler"
                      value={project.name}
                      onChange={(e) => handleProjectChange(index, 'name', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tech Stack (comma separated)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. React, Node.js, Redis, Docker"
                      value={
                        Array.isArray(project.techStack)
                          ? project.techStack.join(', ')
                          : project.techStack || ''
                      }
                      onChange={(e) => handleProjectChange(index, 'techStack', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Briefly describe the engineering problem solved, metrics, and architecture"
                    value={project.description || ''}
                    onChange={(e) => handleProjectChange(index, 'description', e.target.value)}
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">GitHub Repository URL</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://github.com/username/project"
                      value={project.githubUrl || ''}
                      onChange={(e) => handleProjectChange(index, 'githubUrl', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Live Deployment URL</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://project.example.com"
                      value={project.liveUrl || ''}
                      onChange={(e) => handleProjectChange(index, 'liveUrl', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '1.25rem',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleExportData}
              className="btn btn-secondary"
              disabled={exporting || saving || deleting}
              title="Download all stored personal candidate records as JSON"
            >
              {exporting ? <span className="spinner" /> : 'Export My Data (JSON)'}
            </button>

            <button
              type="button"
              onClick={handleDeleteProfile}
              className="btn btn-outline"
              disabled={deleting || saving || exporting}
              style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }}
              title="Purge profile attributes and assessments, retaining account credentials"
            >
              {deleting ? 'Processing...' : 'Reset Profile Data'}
            </button>

            <button
              type="button"
              onClick={handleDeleteAccount}
              className="btn btn-danger"
              disabled={deleting || saving || exporting}
              title="Permanently remove your account and all associated documents"
            >
              {deleting ? 'Deleting Account...' : 'Delete Entire Account'}
            </button>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || deleting || exporting}
            style={{ minWidth: '160px' }}
          >
            {saving ? <span className="spinner" /> : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
