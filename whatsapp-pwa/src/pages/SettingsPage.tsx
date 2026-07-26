import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGenerateMcpToken } from '../api/queries';

const EXPIRY_OPTIONS = [
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
  { label: '6 months', value: '180d' },
  { label: '1 year', value: '365d' },
  { label: '2 years', value: '730d' },
  { label: 'Never (10 years)', value: '3650d' },
];

export default function SettingsPage(): React.ReactElement {
  const navigate = useNavigate();
  const generateToken = useGenerateMcpToken();

  const [expiresIn, setExpiresIn] = useState('365d');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (): Promise<void> => {
    try {
      const result = await generateToken.mutateAsync(expiresIn);
      setGeneratedToken(result.token);
      setCopied(false);
      toast.success('MCP token generated successfully');
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to generate token';
      toast.error(message);
    }
  };

  const handleCopy = async (): Promise<void> => {
    if (!generatedToken) return;
    try {
      await navigator.clipboard.writeText(generatedToken);
      setCopied(true);
      toast.success('Token copied to clipboard');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-whatsapp-bg">
      {/* Header */}
      <header className="bg-whatsapp-teal text-white px-4 py-3 shadow-md sticky top-0 z-10 flex items-center gap-3 pt-[calc(12px+env(safe-area-inset-top))]">
        <button
          onClick={() => navigate('/chats')}
          className="p-3 hover:bg-whatsapp-green rounded-full transition-colors duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Back to chats"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Settings</h1>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* MCP Token Section */}
        <section className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-whatsapp-teal" />
            <h2 className="text-lg font-semibold text-gray-800">MCP Token</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Generate a long-lived JWT token for use with the WhatsApp MCP server.
            This token allows AI agents to access your WhatsApp account through the
            Model Context Protocol.
          </p>

          {/* Expiry Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="expiry">
              Token Lifetime
            </label>
            <select
              id="expiry"
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent min-h-[44px] bg-white"
            >
              {EXPIRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generateToken.isPending}
            className="w-full py-3 px-4 bg-whatsapp-teal hover:bg-whatsapp-teal-dark text-white font-medium rounded-md transition-colors disabled:opacity-50 flex items-center justify-center min-h-[44px]"
          >
            {generateToken.isPending ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Generating...
              </>
            ) : (
              'Generate MCP Token'
            )}
          </button>

          {/* Generated Token Display */}
          {generatedToken && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your MCP Token
              </label>
              <div className="relative">
                <textarea
                  readOnly
                  value={generatedToken}
                  rows={3}
                  className="w-full px-3 py-2.5 pr-12 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono text-gray-700 resize-none focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="absolute top-2 right-2 p-2 hover:bg-gray-200 rounded-md transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                  aria-label={copied ? 'Copied' : 'Copy to clipboard'}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Set this token as <code className="bg-gray-100 px-1 rounded">WHATSAPP_API_JWT</code> in your
                MCP server's <code className="bg-gray-100 px-1 rounded">.env</code> file.
                The token will expire in{' '}
                {EXPIRY_OPTIONS.find((o) => o.value === expiresIn)?.label.toLowerCase()}.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}