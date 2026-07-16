import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React error boundary that catches render errors and displays a fallback UI.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-4 text-center">
          <div className="text-red-500 text-4xl mb-2">⚠</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Something went wrong</h2>
          <p className="text-sm text-gray-500 mb-3">
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </p>
          <button
            onClick={(): void => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-whatsapp-primary text-white rounded-lg text-sm hover:bg-whatsapp-secondary transition-colors min-h-touch"
            type="button"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}