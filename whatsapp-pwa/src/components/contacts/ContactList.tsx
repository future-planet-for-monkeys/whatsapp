import { useState, useMemo } from 'react';
import { useContacts } from '../../api/queries';
import { Avatar } from '../ui/Avatar';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useDebounce } from '../../hooks/useDebounce';
import type { ContactItem } from '../../api/types';

export interface ContactListProps {
  /** Called when a contact is selected */
  onSelectContact: (contact: ContactItem) => void;
  /** Optional search query for filtering */
  searchQuery?: string;
  /** Called when search query changes */
  onSearchChange?: (query: string) => void;
}

/**
 * Filterable contact list.
 * Shows all WhatsApp contacts with a search bar for client-side filtering.
 */
export function ContactList({ onSelectContact, searchQuery = '', onSearchChange }: ContactListProps): JSX.Element {
  const [localSearch, setLocalSearch] = useState<string>(searchQuery);
  const debouncedSearch = useDebounce(localSearch, 300);
  const { data, isLoading, isError, error } = useContacts();

  const filteredContacts = useMemo<ContactItem[]>(() => {
    if (!data?.contacts) return [];
    if (!debouncedSearch.trim()) return data.contacts;

    const query = debouncedSearch.toLowerCase().trim();
    return data.contacts.filter(
      (c: ContactItem) =>
        (c.name && c.name.toLowerCase().includes(query)) ||
        c.pushname.toLowerCase().includes(query) ||
        c.number.includes(query) ||
        (c.shortName && c.shortName.toLowerCase().includes(query)),
    );
  }, [data, debouncedSearch]);

  const handleSearchChange = (value: string): void => {
    setLocalSearch(value);
    onSearchChange?.(value);
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <LoadingSpinner message="Loading contacts..." size="lg" />
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-red-500 mb-2">Failed to load contacts</p>
        <p className="text-sm text-gray-500">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (filteredContacts.length === 0) {
    return (
      <div className="flex flex-col h-full bg-[#f0f2f5]">
        {/* Search bar */}
        <div className="px-4 py-3 bg-white border-b border-gray-100">
          <div className="relative">
            <input
              type="text"
              value={localSearch}
              onChange={(e): void => handleSearchChange(e.target.value)}
              placeholder="Search contacts…"
              className="w-full rounded-lg border border-transparent bg-[#f0f2f5] pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#008069] focus:bg-white min-h-touch transition-all"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="text-4xl mb-2">👤</div>
            <p className="text-gray-500 font-medium">
              {debouncedSearch.trim() ? 'No contacts found' : 'No contacts available'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {debouncedSearch.trim()
                ? 'Try a different search term'
                : 'Add contacts to get started'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Loaded state ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Search bar */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="relative">
          <input
            type="text"
            value={localSearch}
            onChange={(e): void => handleSearchChange(e.target.value)}
            placeholder="Search contacts…"
            className="w-full rounded-lg border border-transparent bg-[#f0f2f5] pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#008069] focus:bg-white min-h-touch transition-all"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.map((contact: ContactItem) => (
          <button
            key={contact.id}
            onClick={(): void => onSelectContact(contact)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-100 min-h-touch text-left"
            type="button"
          >
            <Avatar contactId={contact.id} name={contact.name || contact.pushname} size={40} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {contact.name || contact.pushname || contact.number}
              </p>
              <p className="text-xs text-gray-500 truncate">{contact.number}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}