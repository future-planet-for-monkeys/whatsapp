import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ChatView from '../components/chat/ChatView';

export default function ChatPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <p className="text-red-500 font-semibold mb-2">No Chat Selected</p>
          <button
            onClick={() => navigate('/chats')}
            className="bg-whatsapp-teal text-white px-4 py-2 rounded-lg shadow hover:bg-opacity-90 transition-colors"
          >
            Go to Chats
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-whatsapp-bg">
      <main className="flex-1 h-full overflow-hidden">
        <ChatView chatId={id} onBack={() => navigate('/chats')} />
      </main>
    </div>
  );
}
