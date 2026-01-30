/**
 * Logger Utility
 * 개발 환경에서만 로그 출력, 프로덕션에서는 제거
 */

const isDev = import.meta.env.DEV;
const isTest = import.meta.env.MODE === 'test';

type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

interface LogContext {
  userId?: string | null;
  operation?: string;
  resourceId?: string;
  [key: string]: unknown;
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    // 테스트 환경에서는 로그 출력 안 함 (테스트 출력 방해)
    if (isTest) return false;
    // 개발 환경에서만 로그 출력
    return isDev;
  }

  private formatMessage(prefix: string, message: string, context?: LogContext): string {
    const parts = [prefix, message];
    if (context) {
      const contextStr = Object.entries(context)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(', ');
      if (contextStr) {
        parts.push(`[${contextStr}]`);
      }
    }
    return parts.join(' ');
  }

  log(message: string, context?: LogContext): void {
    if (!this.shouldLog('log')) return;
    console.log(this.formatMessage('[LOG]', message, context));
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;
    console.info(this.formatMessage('[INFO]', message, context));
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return;
    console.warn(this.formatMessage('[WARN]', message, context));
  }

  error(message: string, context?: LogContext & { error?: unknown }): void {
    if (!this.shouldLog('error')) return;
    const errorContext = { ...context };
    if (context?.error instanceof Error) {
      errorContext.errorMessage = context.error.message;
      errorContext.errorStack = context.error.stack;
    }
    console.error(this.formatMessage('[ERROR]', message, errorContext));
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return;
    console.debug(this.formatMessage('[DEBUG]', message, context));
  }
}

export const logger = new Logger();
