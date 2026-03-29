import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-red-50 p-4 rounded-2xl mb-4">
            <AlertCircle className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Something went wrong</h1>
          <p className="text-neutral-600 mb-6 max-w-xs mx-auto">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-neutral-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-neutral-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh App
          </button>
          {process.env.NODE_ENV !== 'production' && (
            <pre className="mt-8 p-4 bg-neutral-100 rounded-lg text-left text-xs overflow-auto max-w-full text-red-800 border border-red-200">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return (this as any).props.children;
  }
}
