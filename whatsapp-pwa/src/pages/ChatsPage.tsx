import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquarePlus, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import ChatList from '../components/chat/ChatList';

export default function ChatsPage(): React.ReactElement {
  const navigate = useNavigate();
  const clearToken = useAuthStore((state) => state.clearToken);

  const handleLogout = (): void => {
    clearToken();
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-whatsapp-bg">
      {/* Header with safe-area-inset-top */}
      <header className="bg-whatsapp-teal text-white px-4 py-3 shadow-md sticky top-0 z-10 flex items-center justify-between pt-[calc(12px+env(safe-area-inset-top))]">
        <h1 className="text-xl font-bold">Chats</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/new-chat')}
            className="p-3 hover:bg-whatsapp-green rounded-full transition-colors duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="New Chat"
          >
            <MessageSquarePlus className="w-6 h-6" />
          </button>
          <button
            onClick={handleLogout}
            className="p-3 hover:bg-whatsapp-green rounded-full transition-colors duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Logout"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Chat List */}
      <main className="flex-1 overflow-y-auto bg-white">
        <ChatList />
      </main>
    </div>
  );
}
