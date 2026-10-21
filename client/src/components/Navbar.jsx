import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="nav-inner">
        <Link
          to={isAuthenticated ? (user?.role === 'admin' ? '/admin/overview' : '/dashboard') : '/login'}
          className="nav-brand"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: user?.role === 'admin' ? '#d97706' : 'var(--primary)' }}
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span>Placement Copilot</span>
          {user?.role === 'admin' && (
            <span
              style={{
                fontSize: '0.72rem',
                background: '#fef3c7',
                color: '#92400e',
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                fontWeight: 700,
                marginLeft: '0.35rem',
                border: '1px solid #fde68a',
                letterSpacing: '0.02em'
              }}
            >
              Placement Cell
            </span>
          )}
        </Link>

        <nav className="nav-links">
          {isAuthenticated ? (
            user?.role === 'admin' ? (
              // Dedicated Administrator / Placement Cell Navigation
              <>
                <NavLink
                  to="/admin/overview"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Overview
                </NavLink>
                <NavLink
                  to="/admin/students"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  All Students
                </NavLink>
                <NavLink
                  to="/admin/readiness"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Readiness
                </NavLink>
                <NavLink
                  to="/admin/resumes"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Resumes
                </NavLink>
                <NavLink
                  to="/admin/linkedin"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  LinkedIn
                </NavLink>
                <NavLink
                  to="/admin/projects"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Projects
                </NavLink>
                <NavLink
                  to="/admin/interviews"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Interviews
                </NavLink>
                <NavLink
                  to="/admin/coding-results"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Coding
                </NavLink>
                <NavLink
                  to="/admin/jobs"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Jobs & Drives
                </NavLink>
                <NavLink
                  to="/admin/settings"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Settings
                </NavLink>

                <div className="user-badge" style={{ borderColor: '#fde68a' }}>
                  <Link to="/admin/settings" style={{ color: 'inherit', textDecoration: 'none' }}>
                    <span>{user?.name || 'Administrator'}</span>
                  </Link>
                  <span
                    className="role-pill"
                    style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}
                  >
                    Placement Cell
                  </span>
                </div>

                <button onClick={handleLogout} className="btn btn-secondary btn-sm" title="Log out">
                  Logout
                </button>
              </>
            ) : (
              // Dedicated Student Navigation
              <>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/readiness"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Readiness Score
                </NavLink>
                <NavLink
                  to="/interview"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Mock Interview
                </NavLink>
                <NavLink
                  to="/coding"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Coding
                </NavLink>
                <NavLink
                  to="/jobs"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Jobs
                </NavLink>
                <NavLink
                  to="/applications"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Tracker
                </NavLink>
                <NavLink
                  to="/resume-review"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Resume
                </NavLink>
                <NavLink
                  to="/linkedin-review"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  LinkedIn
                </NavLink>
                <NavLink
                  to="/achievements-assessment"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Co-Curricular
                </NavLink>
                <NavLink
                  to="/projects"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Projects
                </NavLink>

                <div className="user-badge">
                  <Link to="/profile" style={{ color: 'inherit', textDecoration: 'none' }}>
                    <span>{user?.name || 'Student'}</span>
                  </Link>
                  <span className="role-pill">{user?.role || 'student'}</span>
                </div>

                <button onClick={handleLogout} className="btn btn-secondary btn-sm" title="Log out">
                  Logout
                </button>
              </>
            )
          ) : (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                Login
              </NavLink>
              <NavLink to="/register" className="btn btn-primary btn-sm">
                Register
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
