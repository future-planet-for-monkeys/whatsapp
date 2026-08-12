import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useClientState } from '../api/queries';
import LoadingSpinner from './ui/LoadingSpinner';

interface RequireReadyProps {
  children: React.ReactNode;
}

export default function RequireReady({ children }: RequireReadyProps): React.ReactElement {
  const navigate = useNavigate();
  const { username, password, token } = useAuthStore();
  const hasCredentials = !!username && !!password;
  const hasToken = !!token;

  // If no credentials or no JWT token, redirect to login immediately
  if (!hasCredentials || !hasToken) {
    return <Navigate to="/login" replace />;
  }

  const { data, isLoading, error } = useClientState({
    enabled: hasCredentials,
    refetchInterval: 30000, // Poll every 30s
  });

  // If ready becomes false, redirect immediately to /pair
  useEffect(() => {
    if (data && !data.ready) {
      navigate('/pair', { replace: true });
    }
  }, [data, navigate]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" className="mb-4" />
        <p className="text-gray-600 text-sm font-medium">Checking WhatsApp connection...</p>
      </div>
    );
  }

  if (error) {
    return <Navigate to="/login" replace />;
  }

  // Only render children if ready is true
  if (data?.ready) {
    return <>{children}</>;
  }

  // While checking or redirecting, show spinner
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <LoadingSpinner size="lg" className="mb-4" />
      <p className="text-gray-600 text-sm font-medium">Redirecting...</p>
    </div>
  );
}
