import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-canvas-bg flex items-center justify-center p-6">
          <div className="bg-surface-card border border-border-subtle rounded-2xl p-8 max-w-lg w-full shadow-lg text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px]">error</span>
            </div>
            <h2 className="font-headline-md text-headline-md font-bold text-brand-navy-deep">
              Unable to load page
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              An unexpected error occurred while rendering this section:
            </p>
            {this.state.error?.message && (
              <div className="p-3 bg-surface rounded-xl text-rose-700 font-mono-data text-xs text-left overflow-x-auto border border-border-subtle">
                {this.state.error.message}
              </div>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-5 h-[42px] rounded-xl bg-primary text-on-primary font-label-md font-bold shadow-md hover:bg-primary-container transition-all"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={() => (window.location.href = '/dashboard')}
                className="px-5 h-[42px] rounded-xl bg-surface-card border border-border-subtle text-brand-navy-deep font-label-md font-bold hover:bg-surface-subtle transition-all"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
