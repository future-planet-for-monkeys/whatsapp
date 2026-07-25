import React, { useState, useEffect } from 'react';
import {
  useContact,
  useSaveContact,
  useDeleteContact,
  useLabels,
  useChatLabels,
  useUpdateChatLabels,
} from '../../api/queries';
import Avatar from '../ui/Avatar';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ContactEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatName: string | null | undefined;
}

export default function ContactEditorModal({
  isOpen,
  onClose,
  chatId,
  chatName,
}: ContactEditorModalProps): React.ReactElement | null {
  const { data: contact, isLoading: isLoadingContact, error: contactError } = useContact(chatId, { enabled: isOpen });
  const { data: allLabels } = useLabels({ enabled: isOpen });
  const { data: chatLabels } = useChatLabels(chatId, { enabled: isOpen });

  const saveContactMutation = useSaveContact(chatId);
  const deleteContactMutation = useDeleteContact(chatId);
  const updateChatLabelsMutation = useUpdateChatLabels(chatId);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [syncToAddressbook, setSyncToAddressbook] = useState(true);
  const [selectedLabelIds, setSelectedLabelIds] = useState<(string | number)[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form fields when contact loads
  useEffect(() => {
    if (contact) {
      const fullName = contact.name || contact.pushname || '';
      const spaceIndex = fullName.trim().indexOf(' ');
      if (spaceIndex !== -1) {
        setFirstName(fullName.substring(0, spaceIndex).trim());
        setLastName(fullName.substring(spaceIndex + 1).trim());
      } else {
        setFirstName(fullName.trim());
        setLastName('');
      }
      setSyncToAddressbook(contact.isMyContact);
    }
  }, [contact]);

  // Initialize labels when chat labels load
  useEffect(() => {
    if (chatLabels) {
      setSelectedLabelIds(chatLabels.map((l) => l.id));
    }
  }, [chatLabels]);

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLabelToggle = (labelId: string | number) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      // 1. Save contact if editable
      if (contact?.canEdit) {
        await saveContactMutation.mutateAsync({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          syncToAddressbook,
        });
      }

      // 2. Save labels if labels are supported/available
      const labelsList = allLabels || [];
      if (labelsList.length > 0) {
        await updateChatLabelsMutation.mutateAsync({
          labelIds: selectedLabelIds,
        });
      }

      onClose();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to save contact');
    }
  };

  const handleDelete = async () => {
    setErrorMessage(null);
    try {
      await deleteContactMutation.mutateAsync();
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to delete contact');
    }
  };

  const isSaving =
    saveContactMutation.isPending ||
    updateChatLabelsMutation.isPending ||
    deleteContactMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-40 transition-opacity duration-200 animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet / Modal */}
      <div className="relative w-full max-h-[90vh] flex flex-col bg-white rounded-t-2xl shadow-xl transition-all duration-200 transform translate-y-0 sm:max-w-md sm:rounded-2xl overflow-hidden z-10 animate-slide-up sm:animate-scale-in">
        {/* Drag handle for mobile */}
        <div className="flex justify-center py-2.5 sm:hidden shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 shrink-0">
          <Avatar
            contact={
              contact
                ? {
                    lid: contact.id,
                    pn: contact.phoneNumber,
                    name: contact.name,
                    avatarUrl: contact.avatarUrl,
                  }
                : null
            }
            name={contact?.name || chatName || 'Contact'}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-gray-900 truncate">
              {contact?.name || chatName || 'Contact Details'}
            </h4>
            {contact?.pushname && (
              <p className="text-xs text-gray-500 truncate">
                Pushname: ~{contact.pushname}
              </p>
            )}
            <p className="text-xs text-gray-400 truncate">
              {contact?.phoneNumber ? `+${contact.phoneNumber}` : 'Privacy Restricted (@lid)'}
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoadingContact ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-2">
              <LoadingSpinner size="md" />
              <span className="text-xs text-gray-500">Loading contact details...</span>
            </div>
          ) : contactError ? (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg">
              Failed to load contact details. Please try again.
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg">
                  {errorMessage}
                </div>
              )}

              {/* Contact Fields */}
              {contact?.canEdit ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First Name"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors"
                      required
                      disabled={isSaving}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last Name"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors"
                      disabled={isSaving}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="syncToAddressbook"
                      checked={syncToAddressbook}
                      onChange={(e) => setSyncToAddressbook(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      disabled={isSaving}
                    />
                    <label
                      htmlFor="syncToAddressbook"
                      className="text-xs text-gray-600 font-medium select-none cursor-pointer"
                    >
                      Sync with phone contacts
                    </label>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
                  This contact is privacy-restricted (@lid-only) and cannot be saved or edited in your phone's address book.
                </div>
              )}

              {/* Labels Section */}
              {allLabels && allLabels.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Labels
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {allLabels.map((label) => {
                      const isChecked = selectedLabelIds.includes(label.id);
                      return (
                        <div
                          key={label.id}
                          onClick={() => !isSaving && handleLabelToggle(label.id)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: label.hexColor || '#ccc' }}
                            />
                            <span className="text-xs font-medium text-gray-700">
                              {label.name}
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // Handled by parent div onClick
                            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 pointer-events-none"
                            disabled={isSaving}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                {showDeleteConfirm ? (
                  <div className="bg-red-50 p-3 rounded-lg space-y-2">
                    <p className="text-xs text-red-700 font-medium">
                      Are you sure you want to delete this contact from your address book? This action cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors"
                        disabled={isSaving}
                      >
                        {isSaving ? 'Deleting...' : 'Yes, Delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
                        disabled={isSaving}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-1"
                        disabled={isSaving}
                      >
                        {isSaving ? <LoadingSpinner size="sm" /> : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
                        disabled={isSaving}
                      >
                        Cancel
                      </button>
                    </div>

                    {contact?.isMyContact && (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full py-2 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-xl transition-colors border border-transparent hover:border-red-100"
                        disabled={isSaving}
                      >
                        Delete Contact
                      </button>
                    )}
                  </>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
