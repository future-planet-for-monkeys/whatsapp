import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, MessageSquare, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useCheckPhone } from '../api/queries';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Avatar from '../components/ui/Avatar';
import { CheckResponse } from '../api/types';

export default function NewChatPage(): React.ReactElement {
  const navigate = useNavigate();
  const [phoneInput, setPhoneInput] = useState('');
  const [checkResult, setCheckResult] = useState<CheckResponse | null>(null);

  const checkPhoneMutation = useCheckPhone();

  // Format-as-you-type function
  const formatPhone = (value: string): string => {
    const hasPlus = value.startsWith('+');
    const digits = value.replace(/\D/g, '');

    if (hasPlus) {
      return '+' + digits;
    }

    if (digits.length === 0) {
      return '';
    }

    if (digits.length <= 3) {
      return `(${digits}`;
    }
    if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    }
    if (digits.length <= 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    // If it's 11 digits and starts with 1, format as US with +1
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }

    // Fallback to just digits
    return digits;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const formatted = formatPhone(e.target.value);
    setPhoneInput(formatted);
    // Clear previous result if user edits the input
    if (checkResult) {
      setCheckResult(null);
    }
  };

  const handleCheck = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const digits = phoneInput.replace(/\D/g, '');
    if (!digits) {
      toast.error('Please enter a valid phone number');
      return;
    }

    // If the input starts with '+', we pass the full input (with '+') so the backend knows it has a country code.
    // Otherwise, we pass the digits.
    const phoneToSend = phoneInput.startsWith('+') ? `+${digits}` : digits;

    checkPhoneMutation.mutate(phoneToSend, {
      onSuccess: (data) => {
        if (data.registered) {
          setCheckResult(data);
        } else {
          toast.error('This number is not on WhatsApp');
          setCheckResult(null);
        }
      },
      onError: (err: any) => {
        setCheckResult(null);
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 503) {
            const data = err.response.data as { error?: string; retryAfterSeconds?: number };
            const retryAfter = data.retryAfterSeconds ?? 10;
            toast.error(`WhatsApp is not ready — try again in ${retryAfter}s`);
            return;
          }
          const errMsg = (err.response?.data as any)?.error || err.message;
          toast.error(errMsg);
        } else {
          toast.error(err.message || 'An unexpected error occurred');
        }
      },
    });
  };

  const handleOpenChat = (): void => {
    if (checkResult?.whatsappId) {
      navigate(`/chat/${encodeURIComponent(checkResult.whatsappId)}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-whatsapp-bg">
      {/* Header with safe-area-inset-top */}
      <header className="bg-whatsapp-teal text-white px-4 py-3 shadow-md sticky top-0 z-10 flex items-center gap-3 pt-[calc(12px+env(safe-area-inset-top))]">
        <button
          onClick={() => navigate('/chats')}
          className="p-2.5 hover:bg-whatsapp-green rounded-full transition-colors duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Back to Chats"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">New Chat</h1>
      </header>

      <main className="flex-1 p-4 max-w-md w-full mx-auto flex flex-col gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <Phone className="w-5 h-5 text-whatsapp-teal" />
            Start Chat by Phone Number
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Enter a phone number to check if they are on WhatsApp and start a conversation.
          </p>

          <form onSubmit={handleCheck} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="phone">
                Phone Number
              </label>
              <input
                id="phone"
                type="text"
                value={phoneInput}
                onChange={handlePhoneChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent text-lg"
                placeholder="e.g. +1 (555) 019-9000"
                disabled={checkPhoneMutation.isPending}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={checkPhoneMutation.isPending || !phoneInput.trim()}
              className="w-full py-2.5 px-4 bg-whatsapp-teal hover:bg-whatsapp-teal-dark text-white font-medium rounded-md transition-colors disabled:opacity-50 flex items-center justify-center min-h-[44px]"
            >
              {checkPhoneMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Checking...
                </>
              ) : (
                'Check WhatsApp'
              )}
            </button>
          </form>
        </div>

        {/* Confirmation Card */}
        {checkResult && checkResult.registered && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-whatsapp-teal/20 animate-fade-in flex flex-col items-center text-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-50 text-green-600 mb-1">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <Avatar
              contact={checkResult.contactInfo}
              name={checkResult.contactInfo?.name || checkResult.contactInfo?.pn || 'WhatsApp User'}
              size="lg"
            />

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-900">
                {checkResult.contactInfo?.name || 'WhatsApp User'}
              </h3>
              <p className="text-sm text-gray-500">
                Resolved: <span className="font-mono font-medium text-gray-700">{checkResult.contactInfo?.pn}</span>
              </p>
            </div>

            <button
              onClick={handleOpenChat}
              className="w-full mt-2 py-2.5 px-4 bg-whatsapp-teal hover:bg-whatsapp-teal-dark text-white font-medium rounded-md transition-colors flex items-center justify-center gap-2 min-h-[44px]"
            >
              <MessageSquare className="w-5 h-5" />
              Open Chat
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
