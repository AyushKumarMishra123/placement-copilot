import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ResumeIntelligence from './pages/ResumeIntelligence';
import GitHubReview from './pages/GitHubReview';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import ReadinessDashboard from './pages/ReadinessDashboard';
import LinkedInReview from './pages/LinkedInReview';
import AchievementAssessment from './pages/AchievementAssessment';


// AI Mock Interview
import InterviewSetup from './pages/InterviewSetup';
import InterviewSession from './pages/InterviewSession';
import InterviewReport from './pages/InterviewReport';

// Job Discovery, Applications & Admin Board
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import Applications from './pages/Applications';
import AdminJobs from './pages/admin/AdminJobs';
import AdminJobForm from './pages/admin/AdminJobForm';
import AdminApplicants from './pages/admin/AdminApplicants';

// Coding Assessment & DSA Engine
import CodingAssessments from './pages/CodingAssessments';
import CodingProblemDetail from './pages/CodingProblemDetail';
import AdminCodingProblems from './pages/admin/AdminCodingProblems';
import AdminCodingProblemForm from './pages/admin/AdminCodingProblemForm';

// Dedicated Admin Dashboard & Telemetry
import AdminOverview from './pages/admin/AdminOverview';
import AdminStudents from './pages/admin/AdminStudents';
import AdminStudentDetail from './pages/admin/AdminStudentDetail';
import AdminReadiness from './pages/admin/AdminReadiness';
import AdminResumes from './pages/admin/AdminResumes';
import AdminLinkedIn from './pages/admin/AdminLinkedIn';
import AdminProjects from './pages/admin/AdminProjects';
import AdminInterviews from './pages/admin/AdminInterviews';
import AdminCodingResults from './pages/admin/AdminCodingResults';
import AdminSettings from './pages/admin/AdminSettings';

import useAuth from './hooks/useAuth';

const RootRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={user?.role === 'admin' ? '/admin/overview' : '/dashboard'} replace />;
};

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Core Dashboard & Profile */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Placement Readiness Scoring Engine */}
          <Route
            path="/readiness"
            element={
              <ProtectedRoute>
                <ReadinessDashboard />
              </ProtectedRoute>
            }
          />

          {/* Resume Intelligence */}
          <Route
            path="/resume-review"
            element={
              <ProtectedRoute>
                <ResumeIntelligence />
              </ProtectedRoute>
            }
          />

          {/* GitHub & Project Auditing */}
          <Route
            path="/github-review"
            element={
              <ProtectedRoute>
                <GitHubReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/linkedin-review"
            element={
              <ProtectedRoute>
                <LinkedInReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/achievements-assessment"
            element={
              <ProtectedRoute>
                <AchievementAssessment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              <ProtectedRoute>
                <ProjectDetail />
              </ProtectedRoute>
            }
          />

          {/* AI Mock Interview */}
          <Route
            path="/interview"
            element={
              <ProtectedRoute studentOnly>
                <InterviewSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interview/:id"
            element={
              <ProtectedRoute studentOnly>
                <InterviewSession />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interview/:id/report"
            element={
              <ProtectedRoute>
                <InterviewReport />
              </ProtectedRoute>
            }
          />

          {/* Jobs & Applications */}
          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <Jobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs/:jobId"
            element={
              <ProtectedRoute>
                <JobDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute>
                <Applications />
              </ProtectedRoute>
            }
          />

          {/* Coding Assessment & DSA Arena */}
          <Route
            path="/coding"
            element={
              <ProtectedRoute>
                <CodingAssessments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coding/:id"
            element={
              <ProtectedRoute studentOnly>
                <CodingProblemDetail />
              </ProtectedRoute>
            }
          />

          {/* Dedicated Placement Cell Admin Portal */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminOverview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/overview"
            element={
              <ProtectedRoute adminOnly>
                <AdminOverview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <ProtectedRoute adminOnly>
                <AdminStudents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students/:studentId"
            element={
              <ProtectedRoute adminOnly>
                <AdminStudentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/readiness"
            element={
              <ProtectedRoute adminOnly>
                <AdminReadiness />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/resumes"
            element={
              <ProtectedRoute adminOnly>
                <AdminResumes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/linkedin"
            element={
              <ProtectedRoute adminOnly>
                <AdminLinkedIn />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/projects"
            element={
              <ProtectedRoute adminOnly>
                <AdminProjects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/interviews"
            element={
              <ProtectedRoute adminOnly>
                <AdminInterviews />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/coding-results"
            element={
              <ProtectedRoute adminOnly>
                <AdminCodingResults />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute adminOnly>
                <AdminSettings />
              </ProtectedRoute>
            }
          />

          {/* Admin Coding Question Management */}
          <Route
            path="/admin/coding"
            element={
              <ProtectedRoute adminOnly>
                <AdminCodingProblems />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/coding/new"
            element={
              <ProtectedRoute adminOnly>
                <AdminCodingProblemForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/coding/:id/edit"
            element={
              <ProtectedRoute adminOnly>
                <AdminCodingProblemForm />
              </ProtectedRoute>
            }
          />

          {/* Admin Job Board */}
          <Route
            path="/admin/jobs"
            element={
              <ProtectedRoute adminOnly>
                <AdminJobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/jobs/new"
            element={
              <ProtectedRoute adminOnly>
                <AdminJobForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/jobs/:jobId/edit"
            element={
              <ProtectedRoute adminOnly>
                <AdminJobForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/jobs/:jobId/applicants"
            element={
              <ProtectedRoute adminOnly>
                <AdminApplicants />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
