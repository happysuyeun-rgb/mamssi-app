import React, { useState } from 'react';

const SPLASH_IMAGE = '/splash.png';

type LoadingSplashProps = {
  message?: string;
};

export default function LoadingSplash({ message = '로딩 중...' }: LoadingSplashProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%)',
        color: '#2e7d32',
      }}
    >
      {!imageError ? (
        <img
          src={SPLASH_IMAGE}
          alt="마음,씨"
          style={{
            width: 'min(320px, 85vw)',
            height: 'auto',
            objectFit: 'contain',
          }}
          onError={() => setImageError(true)}
        />
      ) : (
        <div
          style={{
            fontSize: 48,
            marginBottom: 16,
            animation: 'spin 1s linear infinite',
          }}
        >
          🌱
        </div>
      )}
      {message && (
        <p
          style={{
            marginTop: 16,
            fontSize: 14,
            color: 'var(--ms-ink-soft, #558b2f)',
            fontWeight: 500,
          }}
        >
          {message}
        </p>
      )}
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
