import React from 'react';
import { useParams } from 'react-router-dom';

export default function ChatPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex flex-col min-h-screen bg-whatsapp-bg">
      <header className="bg-whatsapp-teal text-white p-4 shadow-md">
        <h1 className="text-xl font-bold">Chat: {id}</h1>
      </header>
      <main className="flex-1 p-4">
        <p className="text-gray-600 text-center">Placeholder Chat Page for {id}</p>
      </main>
    </div>
  );
}
