import React from 'react';

export default function ChatsPage(): React.ReactElement {
  return (
    <div className="flex flex-col min-h-screen bg-whatsapp-bg">
      <header className="bg-whatsapp-teal text-white p-4 shadow-md">
        <h1 className="text-xl font-bold">Chats</h1>
      </header>
      <main className="flex-1 p-4">
        <p className="text-gray-600 text-center">Placeholder Chats Page</p>
      </main>
    </div>
  );
}
