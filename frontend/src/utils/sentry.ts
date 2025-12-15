import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export const initSentry = () => {
  if (import.meta.env.VITE_ENVIRONMENT !== 'production') return;
  
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || 'https://your-sentry-dsn@sentry.io/project-id',
    integrations: [
      new BrowserTracing({
        // Set up automatic route change tracking for React Router
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          React.useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes
        ),
      }),
    ],
    environment: import.meta.env.VITE_ENVIRONMENT || 'development',
    tracesSampleRate: 0.1, // Capture 10% of transactions for performance monitoring
    beforeSend(event) {
      // Filter out non-critical errors
      if (event.exception) {
        const error = event.exception.values?.[0];
        if (error?.type === 'ChunkLoadError') {
          return null; // Don't send chunk load errors
        }
      }
      return event;
    },
  });
};

// Healthcare-specific error tracking
export const captureHealthcareError = (error: Error, context: {
  userId?: string;
  userRole?: string;
  action?: string;
  additionalData?: Record<string, any>;
}) => {
  Sentry.withScope((scope) => {
    scope.setTag('healthcare.action', context.action);
    scope.setUser({
      id: context.userId,
      role: context.userRole,
    });
    scope.setContext('healthcare', context.additionalData || {});
    Sentry.captureException(error);
  });
};

// Performance monitoring for critical healthcare actions
export const trackPerformance = (transactionName: string, operation: () => Promise<any>) => {
  const transaction = Sentry.startTransaction({
    name: transactionName,
    op: 'healthcare.operation',
  });
  
  Sentry.getCurrentHub().configureScope(scope => scope.setSpan(transaction));
  
  return operation().finally(() => {
    transaction.finish();
  });
};