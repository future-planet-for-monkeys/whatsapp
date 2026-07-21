import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import LoginPage from './pages/LoginPage.tsx';
import PairPage from './pages/PairPage.tsx';
import ChatsPage from './pages/ChatsPage.tsx';
import ChatPage from './pages/ChatPage.tsx';
import NewChatPage from './pages/NewChatPage.tsx';
import RequireReady from './components/RequireReady.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

import ErrorBoundary from './components/ui/ErrorBoundary.tsx';
import OfflineBanner from './components/ui/OfflineBanner.tsx';

export default function App(): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <OfflineBanner />
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <Routes>
          <Route
            path="/login"
            element={
              <ErrorBoundary>
                <LoginPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="/pair"
            element={
              <ErrorBoundary>
                <PairPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="/chats"
            element={
              <ErrorBoundary>
                <RequireReady>
                  <ChatsPage />
                </RequireReady>
              </ErrorBoundary>
            }
          />
          <Route
            path="/chat/:id"
            element={
              <ErrorBoundary>
                <RequireReady>
                  <ChatPage />
                </RequireReady>
              </ErrorBoundary>
            }
          />
          <Route
            path="/new-chat"
            element={
              <ErrorBoundary>
                <RequireReady>
                  <NewChatPage />
                </RequireReady>
              </ErrorBoundary>
            }
          />
          <Route path="*" element={<Navigate to="/chats" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" reverseOrder={false} />
    </QueryClientProvider>
  );
}
