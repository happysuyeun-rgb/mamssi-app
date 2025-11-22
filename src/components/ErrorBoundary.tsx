import React, { Component, type ReactNode } from 'react';
import { diag } from '@boot/diag';

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

class ErrorBoundaryClass extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    diag.err('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '24px',
            textAlign: 'center',
            color: 'var(--ms-ink)'
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌧</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>문제가 발생했어요</h2>
          <p style={{ fontSize: 14, color: 'var(--ms-ink-soft)', marginBottom: 24 }}>
            잠시 후 다시 시도해주세요.
          </p>
          <button
            onClick={() => {
              window.location.reload();
            }}
            style={{
              padding: '12px 24px',
              borderRadius: 18,
              border: '1px solid var(--ms-line)',
              background: 'var(--ms-primary)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            새로고침
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: 24, textAlign: 'left', maxWidth: 600 }}>
              <summary style={{ cursor: 'pointer', marginBottom: 8 }}>에러 상세 정보</summary>
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 12,
                  overflow: 'auto'
                }}
              >
                {this.state.error.toString()}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  return <ErrorBoundaryClass fallback={fallback}>{children}</ErrorBoundaryClass>;
}

