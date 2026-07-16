import { useState, useCallback } from 'react';
import { useCheckPhone } from '../../api/queries';
import { validatePhoneNumber } from '../../utils/validators';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';

export interface NumberInputProps {
  /** Called when a valid WhatsApp number is found */
  onNumberFound: (whatsappId: string) => void;
}

/**
 * Manual phone number input with format-as-you-type and WhatsApp registration check.
 */
export function NumberInput({ onNumberFound }: NumberInputProps): JSX.Element {
  const [phone, setPhone] = useState<string>('');
  const checkPhoneMutation = useCheckPhone();

  const handlePhoneChange = useCallback((value: string): void => {
    // Allow only digits, +, -, spaces, and parentheses
    const cleaned = value.replace(/[^0-9+\-() ]/g, '');
    setPhone(cleaned);
  }, []);

  const handleCheck = useCallback(async (): Promise<void> => {
    const digits = validatePhoneNumber(phone);
    if (!digits) {
      toast.error('Please enter a valid phone number');
      return;
    }

    try {
      const result = await checkPhoneMutation.mutateAsync(phone);
      if (result.registered && result.whatsappId) {
        onNumberFound(result.whatsappId);
      } else {
        toast.error('This number is not registered on WhatsApp');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to check number';
      toast.error(message);
    }
  }, [phone, checkPhoneMutation, onNumberFound]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCheck();
      }
    },
    [handleCheck],
  );

  const isChecking = checkPhoneMutation.isPending;

  return (
    <div className="flex flex-col gap-5 p-6 bg-white h-full">
      <div>
        <label htmlFor="phone-input" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          Enter phone number
        </label>
        <input
          id="phone-input"
          type="tel"
          value={phone}
          onChange={(e): void => handlePhoneChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="+1 (555) 123-4567"
          className="w-full rounded-md border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#008069] focus:border-[#008069] min-h-touch transition-all"
          disabled={isChecking}
          autoFocus
        />
        <p className="text-xs text-gray-400 mt-1.5">
          Include country code. Format: +1 (555) 123-4567
        </p>
      </div>

      <button
        onClick={handleCheck}
        disabled={!phone.trim() || isChecking}
        className="w-full px-4 py-2.5 bg-[#008069] text-white rounded-md font-medium hover:bg-[#005e4b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-touch flex items-center justify-center gap-2 shadow-sm"
        type="button"
      >
        {isChecking ? (
          <>
            <LoadingSpinner size="sm" />
            <span>Checking...</span>
          </>
        ) : (
          <span>Check WhatsApp</span>
        )}
      </button>
    </div>
  );
}