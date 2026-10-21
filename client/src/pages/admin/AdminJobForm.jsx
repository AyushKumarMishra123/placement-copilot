import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { adminJobAPI } from '../../services/api';
import Alert from '../../components/Alert';

const AdminJobForm = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(jobId);

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    description: '',
    location: 'Bangalore',
    workplaceType: 'hybrid',
    employmentType: 'full-time',
    experienceLevel: 'entry',
    requiredSkills: '',
    preferredSkills: '',
    salary: '',
    currency: 'INR',
    applyUrl: '',
    closingDate: '',
    isActive: true
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      loadExistingJob();
    }
  }, [jobId]);

  const loadExistingJob = async () => {
    setFetching(true);
    try {
      const res = await adminJobAPI.getById(jobId);
      const job = res.data.data?.job;
      if (job) {
        setFormData({
          title: job.title || '',
          company: job.company || '',
          description: job.description || '',
          location: job.location || 'Remote',
          workplaceType: job.workplaceType || 'remote',
          employmentType: job.employmentType || 'full-time',
          experienceLevel: job.experienceLevel || 'entry',
          requiredSkills: Array.isArray(job.requiredSkills) ? job.requiredSkills.join(', ') : '',
          preferredSkills: Array.isArray(job.preferredSkills) ? job.preferredSkills.join(', ') : '',
          salary: job.salary || '',
          currency: job.currency || 'INR',
          applyUrl: job.applyUrl || '',
          closingDate: job.closingDate ? job.closingDate.split('T')[0] : '',
          isActive: job.isActive !== false
        });
      }
    } catch (err) {
      setError('Failed to load existing job details.');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.company || !formData.description || !formData.applyUrl) {
      return setError('Title, company, description, and application URL are required fields.');
    }

    setLoading(true);
    setError('');

    const payload = {
      ...formData,
      requiredSkills: formData.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean),
      preferredSkills: formData.preferredSkills.split(',').map((s) => s.trim()).filter(Boolean),
      closingDate: formData.closingDate || null
    };

    try {
      if (isEdit) {
        await adminJobAPI.update(jobId, payload);
      } else {
        await adminJobAPI.create(payload);
      }
      navigate('/admin/jobs');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save job posting.');
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="loading-container">
        <div className="spinner" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        <p>Loading job form...</p>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <Link to="/admin/jobs" style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          &larr; Back to Admin Postings
        </Link>
      </div>

      <header className="page-header" style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          {isEdit ? 'Edit Placement Job Posting' : 'Post New Verified Campus Opening'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.25rem' }}>
          Published postings immediately appear with explainable 5-factor matching for registered students.
        </p>
      </header>

      {error && <Alert variant="danger" message={error} onClose={() => setError('')} />}

      <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              Job Title <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              name="title"
              className="input"
              placeholder="e.g. Associate Software Engineer, Frontend Intern"
              value={formData.title}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.65rem' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              Company / Organization <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              name="company"
              className="input"
              placeholder="e.g. Microsoft, Razorpay, Campus Labs"
              value={formData.company}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.65rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Location</label>
            <input
              type="text"
              name="location"
              className="input"
              placeholder="e.g. Bangalore, Hyderabad, Remote"
              value={formData.location}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.65rem' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Workplace Type</label>
            <select
              name="workplaceType"
              className="input"
              value={formData.workplaceType}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.65rem' }}
            >
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="on-site">On-Site</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Employment Type</label>
            <select
              name="employmentType"
              className="input"
              value={formData.employmentType}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.65rem' }}
            >
              <option value="full-time">Full-Time</option>
              <option value="internship">Internship</option>
              <option value="contract">Contract</option>
              <option value="part-time">Part-Time</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Compensation / CTC</label>
            <input
              type="text"
              name="salary"
              className="input"
              placeholder="e.g. 10-14 LPA, ₹35,000/mo Stipend"
              value={formData.salary}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.65rem' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Application Closing Date</label>
            <input
              type="date"
              name="closingDate"
              className="input"
              value={formData.closingDate}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.65rem' }}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label" style={{ fontWeight: 600 }}>
            Required Skills (Comma-separated for 50% matching factor) <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            type="text"
            name="requiredSkills"
            className="input"
            placeholder="e.g. React, Node.js, TypeScript, PostgreSQL, Docker"
            value={formData.requiredSkills}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.65rem' }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label" style={{ fontWeight: 600 }}>Preferred / Bonus Skills</label>
          <input
            type="text"
            name="preferredSkills"
            className="input"
            placeholder="e.g. Redis, AWS, CI/CD, Microservices"
            value={formData.preferredSkills}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.65rem' }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label" style={{ fontWeight: 600 }}>
            Application Portal URL / Form Link <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            type="url"
            name="applyUrl"
            className="input"
            placeholder="https://company.example.com/jobs/apply or internal MSOT Google Form"
            value={formData.applyUrl}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '0.65rem' }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label" style={{ fontWeight: 600 }}>
            Job Description & Eligibility Criteria <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <textarea
            name="description"
            className="form-textarea"
            rows={8}
            placeholder="Describe role responsibilities, eligibility requirements (CGPA/branch), selection rounds, and company perks..."
            value={formData.description}
            onChange={handleChange}
            required
            style={{ width: '100%', lineHeight: 1.5 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
          />
          <label htmlFor="isActive" style={{ fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
            Publish listing immediately for student discovery
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Link to="/admin/jobs" className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '150px' }}>
            {loading ? 'Saving...' : isEdit ? 'Update Posting' : 'Publish Job Opening'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminJobForm;
