import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewAPI } from '../services/api';
import Alert from '../components/Alert';

const InterviewSession = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(null);
  const [error, setError] = useState('');

  const timerRef = useRef(null);

  useEffect(() => {
    loadSession();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  const loadSession = async () => {
    setLoading(true);
    try {
      const res = await interviewAPI.getById(id);
      const sess = res.data.data.session;
      setSession(sess);

      // If already evaluated, jump directly to report
      if (sess.status === 'completed' && sess.evaluation) {
        return navigate(`/interview/${sess._id}/report`, { replace: true });
      }

      // Initialize server-controlled timer countdown
      initTimer(sess.expiresAt);

      // Preload current answer if already in transcript
      const currentQ = sess.questions[sess.currentQuestionIndex];
      if (currentQ) {
        const existingAns = sess.transcript.find((t) => t.questionId === currentQ.id);
        if (existingAns && !existingAns.skipped) {
          setAnswerText(existingAns.answerText || '');
        } else {
          setAnswerText('');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load interview session.');
    } finally {
      setLoading(false);
    }
  };

  const initTimer = (expiresAt) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const updateRemaining = () => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        setTimeLeftSeconds(0);
        clearInterval(timerRef.current);
        handleAutoFinishOnExpire();
      } else {
        setTimeLeftSeconds(diff);
      }
    };

    updateRemaining();
    timerRef.current = setInterval(updateRemaining, 1000);
  };

  const handleAutoFinishOnExpire = async () => {
    try {
      setFinishing(true);
      const res = await interviewAPI.complete(id);
      navigate(`/interview/${id}/report`, { replace: true });
    } catch (_) {
      navigate(`/interview/${id}/report`, { replace: true });
    }
  };

  const currentQuestion = session?.questions?.[session.currentQuestionIndex];
  const isLastQuestion = session?.questions && session.currentQuestionIndex === session.questions.length - 1;

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!answerText.trim()) {
      return setError('Please enter your answer before proceeding, or click Skip Question.');
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await interviewAPI.submitAnswer(id, {
        questionId: currentQuestion.id,
        answerText: answerText.trim()
      });

      const updated = res.data.data.session;
      setSession(updated);

      if (isLastQuestion) {
        // Complete interview automatically
        handleCompleteInterview();
      } else {
        // Prepare next question
        const nextQ = updated.questions[updated.currentQuestionIndex];
        const existing = updated.transcript.find((t) => t.questionId === nextQ?.id);
        setAnswerText(existing ? existing.answerText : '');
        setSubmitting(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit answer.');
      setSubmitting(false);
    }
  };

  const handleSkipQuestion = async () => {
    setSubmitting(true);
    setError('');

    try {
      const res = await interviewAPI.skipQuestion(id, {
        questionId: currentQuestion.id
      });

      const updated = res.data.data.session;
      setSession(updated);

      if (isLastQuestion) {
        handleCompleteInterview();
      } else {
        const nextQ = updated.questions[updated.currentQuestionIndex];
        const existing = updated.transcript.find((t) => t.questionId === nextQ?.id);
        setAnswerText(existing ? existing.answerText : '');
        setSubmitting(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to skip question.');
      setSubmitting(false);
    }
  };

  const handleCompleteInterview = async () => {
    setFinishing(true);
    setError('');

    try {
      await interviewAPI.complete(id);
      navigate(`/interview/${id}/report`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete interview evaluation.');
      setFinishing(false);
    }
  };

  const formatTimer = (secs) => {
    if (secs === null) return '--:--';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'technical':
        return 'badge-primary';
      case 'project':
        return 'badge-info';
      case 'problem_solving':
        return 'badge-warning';
      case 'behavioral':
        return 'badge-success';
      default:
        return 'badge-neutral';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        <p>Connecting to timed interview room...</p>
      </div>
    );
  }

  if (finishing) {
    return (
      <div className="loading-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="spinner" style={{ borderColor: 'var(--success)', borderTopColor: 'transparent', margin: '0 auto 1.5rem' }} />
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Evaluating Interview Responses...</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0.5rem auto' }}>
          Scoring your answers across technical accuracy, project architecture, problem solving, and communication against the official 100-point rubric.
        </p>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '880px', margin: '0 auto' }}>
      {/* Top Header Bar with Timer & Progress */}
      <div
        className="card"
        style={{
          padding: '1.25rem 1.75rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            Target Role: <strong>{session?.targetRole}</strong>
          </span>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.15rem 0 0' }}>
            Question {(session?.currentQuestionIndex || 0) + 1} of {session?.questions?.length || 5}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* Server-Controlled Countdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: timeLeftSeconds < 120 ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-subtle)',
              color: timeLeftSeconds < 120 ? 'var(--danger)' : 'var(--text-primary)',
              fontWeight: 700,
              fontFamily: 'monospace',
              fontSize: '1.15rem'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {formatTimer(timeLeftSeconds)}
          </div>

          <button
            onClick={handleCompleteInterview}
            className="btn btn-secondary btn-sm"
            disabled={submitting || finishing}
            title="Finish interview and evaluate current answers"
          >
            End Interview
          </button>
        </div>
      </div>

      {error && <Alert variant="danger" message={error} onClose={() => setError('')} />}

      {/* Active Question Prompt */}
      {currentQuestion && (
        <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span className={`badge ${getCategoryColor(currentQuestion.category)}`} style={{ textTransform: 'capitalize' }}>
              {currentQuestion.category.replace('_', ' ')}
            </span>
            {currentQuestion.contextTarget && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Focus: <strong>{currentQuestion.contextTarget}</strong>
              </span>
            )}
          </div>

          <p style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
            {currentQuestion.prompt}
          </p>
        </div>
      )}

      {/* Answer Form */}
      <form onSubmit={handleSubmitAnswer} className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
            Your Written Response
          </label>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {answerText.trim() ? answerText.trim().split(/\s+/).length : 0} words &bull; {answerText.length} characters
          </span>
        </div>

        <textarea
          className="form-textarea"
          rows={9}
          placeholder="Type your structured engineering answer here. Detail trade-offs, architecture, and concrete examples..."
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          disabled={submitting || finishing}
          style={{ width: '100%', marginBottom: '1.25rem', fontSize: '0.95rem', lineHeight: 1.5 }}
          autoFocus
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <button
            type="button"
            onClick={handleSkipQuestion}
            className="btn btn-secondary"
            disabled={submitting || finishing}
          >
            Skip Question
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || finishing || !answerText.trim()}
            style={{ minWidth: '180px' }}
          >
            {submitting ? (
              <span className="spinner" style={{ width: '16px', height: '16px' }} />
            ) : isLastQuestion ? (
              'Submit & Finish Interview'
            ) : (
              'Submit & Next Question \u2192'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InterviewSession;
