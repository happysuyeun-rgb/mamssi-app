import React from 'react';

type LoadingSplashProps = {
  message?: string;
};

export default function LoadingSplash({ message = '로딩 중...' }: LoadingSplashProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--ms-surface)',
        color: 'var(--ms-ink)',
      }}
    >
      <div
        style={{
          fontSize: 48,
          marginBottom: 16,
          animation: 'spin 1s linear infinite',
        }}
      >
        🌱
      </div>
      <p
        style={{
          fontSize: 14,
          color: 'var(--ms-ink-soft)',
          fontWeight: 500,
        }}
      >
        {message}
      </p>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
