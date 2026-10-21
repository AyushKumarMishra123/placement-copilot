import React from 'react';

const Alert = ({ variant = 'danger', message, onClose }) => {
  if (!message) return null;

  return (
    <div className={`alert alert-${variant}`}>
      <div style={{ flex: 1 }}>{message}</div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            color: 'inherit',
            lineHeight: 1
          }}
          aria-label="Close alert"
        >
          &times;
        </button>
      )}
    </div>
  );
};

export default Alert;
