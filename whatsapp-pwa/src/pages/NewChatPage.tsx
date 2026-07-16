import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContactList } from '../components/contacts/ContactList';
import { NumberInput } from '../components/contacts/NumberInput';
import type { ContactItem } from '../api/types';

type TabMode = 'contacts' | 'number';

/**
 * New chat page with two modes:
 * 1. Select from existing contacts
 * 2. Enter a phone number manually
 */
export function NewChatPage(): JSX.Element {
  const navigate = useNavigate();
  const [mode, setMode] = useState<TabMode>('contacts');

  const handleSelectContact = useCallback(
    (contact: ContactItem): void => {
      navigate(`/chat/${encodeURIComponent(contact.id)}`);
    },
    [navigate],
  );

  const handleNumberFound = useCallback(
    (whatsappId: string): void => {
      navigate(`/chat/${encodeURIComponent(whatsappId)}`);
    },
    [navigate],
  );

  return (
    <div className="h-screen bg-[#f0f2f5] flex flex-col">
      {/* Header */}
      <div className="bg-[#008069] text-white px-4 py-3 flex items-center gap-3 h-[60px] flex-shrink-0">
        <button
          onClick={(): void => navigate('/chats')}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors min-w-touch min-h-touch"
          type="button"
          aria-label="Back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h1 className="text-lg font-semibold">New Chat</h1>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-gray-200 bg-white flex-shrink-0">
        <button
          onClick={(): void => setMode('contacts')}
          className={`flex-1 px-4 py-3 text-sm font-medium text-center transition-colors min-h-touch ${
            mode === 'contacts'
              ? 'text-[#008069] border-b-2 border-[#008069]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          type="button"
        >
          Contacts
        </button>
        <button
          onClick={(): void => setMode('number')}
          className={`flex-1 px-4 py-3 text-sm font-medium text-center transition-colors min-h-touch ${
            mode === 'number'
              ? 'text-[#008069] border-b-2 border-[#008069]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          type="button"
        >
          Phone Number
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-white">
        {mode === 'contacts' ? (
          <ContactList onSelectContact={handleSelectContact} />
        ) : (
          <NumberInput onNumberFound={handleNumberFound} />
        )}
      </div>
    </div>
  );
}