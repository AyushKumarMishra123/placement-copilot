import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import Alert from '../components/Alert';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    adminSecretCode: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validations
    if (!formData.name.trim()) {
      return setError('Please enter your full name');
    }
    if (!formData.email.trim()) {
      return setError('Please enter your email address');
    }
    if (formData.password.length < 6) {
      return setError('Password must be at least 6 characters long');
    }
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }
    if (formData.role === 'admin' && !formData.adminSecretCode.trim()) {
      return setError('Please enter the administrative authorization code.');
    }

    setLoading(true);
    try {
      await authAPI.register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        ...(formData.role === 'admin' ? { adminSecretCode: formData.adminSecretCode.trim() } : {})
      });

      // Navigate to login page with success notification
      navigate('/login', {
        state: { message: 'Registration successful! Please sign in with your credentials.' }
      });
    } catch (err) {
      const serverMessage =
        err.response?.data?.message || err.response?.data?.errors?.[0] || 'Registration failed. Please try again.';
      setError(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Join Placement Copilot to track and elevate your readiness</p>
        </div>

        <Alert variant="danger" message={error} onClose={() => setError('')} />

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">
              Full Name <span className="required">*</span>
            </label>
            <input
              id="reg-name"
              name="name"
              type="text"
              className="form-input"
              placeholder="e.g. Rahul Sharma"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">
              Email Address <span className="required">*</span>
            </label>
            <input
              id="reg-email"
              name="email"
              type="email"
              className="form-input"
              placeholder="name@university.edu"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">
              Password <span className="required">*</span>
            </label>
            <input
              id="reg-password"
              name="password"
              type="password"
              className="form-input"
              placeholder="Minimum 6 characters"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">
              Confirm Password <span className="required">*</span>
            </label>
            <input
              id="reg-confirm"
              name="confirmPassword"
              type="password"
              className="form-input"
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-role">
              Account Role
            </label>
            <select
              id="reg-role"
              name="role"
              className="form-select"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="student">Student / Job Seeker</option>
              <option value="admin">Administrator / Placement Cell</option>
            </select>
          </div>

          {formData.role === 'admin' && (
            <div className="form-group">
              <label className="form-label" htmlFor="reg-admin-secret">
                Admin Authorization Code <span className="required">*</span>
              </label>
              <input
                id="reg-admin-secret"
                name="adminSecretCode"
                type="password"
                className="form-input"
                placeholder="Enter placement cell secret code"
                value={formData.adminSecretCode}
                onChange={handleChange}
                required
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', marginTop: '0.25rem', display: 'block' }}>
                Default: <code>msot_admin_secret_placement_copilot_2026</code>
              </span>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? <span className="spinner" /> : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 600 }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
