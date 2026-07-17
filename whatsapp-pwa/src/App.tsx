import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import LoginPage from './pages/LoginPage.tsx';
import PairPage from './pages/PairPage.tsx';
import ChatsPage from './pages/ChatsPage.tsx';
import ChatPage from './pages/ChatPage.tsx';
import NewChatPage from './pages/NewChatPage.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export default function App(): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/pair" element={<PairPage />} />
          <Route path="/chats" element={<ChatsPage />} />
          <Route path="/chat/:id" element={<ChatPage />} />
          <Route path="/new-chat" element={<NewChatPage />} />
          <Route path="*" element={<Navigate to="/chats" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" reverseOrder={false} />
    </QueryClientProvider>
  );
}
