export interface LoadingSpinnerProps {
  /** Optional message to display below the spinner */
  message?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional className override */
  className?: string;
}

const sizeMap: Record<string, string> = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

/**
 * A simple CSS-based loading spinner.
 */
export function LoadingSpinner({ message, size = 'md', className = '' }: LoadingSpinnerProps): JSX.Element {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <div
        className={`${sizeMap[size]} border-2 border-whatsapp-secondary border-t-transparent rounded-full animate-spin`}
        role="status"
        aria-label="Loading"
      />
      {message && <p className="text-sm text-gray-500">{message}</p>}
    </div>
  );
}