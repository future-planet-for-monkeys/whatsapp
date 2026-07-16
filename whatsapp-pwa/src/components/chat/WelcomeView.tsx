/**
 * Welcome screen shown on desktop when no chat is selected.
 * Mimics the official WhatsApp Web welcome screen.
 */
export function WelcomeView(): JSX.Element {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-[#f8f9fa] border-l border-gray-200 p-8 text-center select-none">
      <div className="max-w-md flex flex-col items-center">
        {/* Modern WhatsApp Web-like Illustration */}
        <div className="w-64 h-64 mb-8 text-gray-300 flex items-center justify-center relative">
          <svg
            viewBox="0 0 360 360"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full text-gray-300"
          >
            <circle cx="180" cy="180" r="120" fill="#E9EDEF" />
            <path
              d="M180 90C130.294 90 90 130.294 90 180C90 198.343 95.4968 215.403 104.914 229.629L95 265L131.371 255.086C145.597 264.503 162.657 270 180 270C229.706 270 270 229.706 270 180C270 130.294 229.706 90 180 90Z"
              fill="#FFFFFF"
              stroke="#E9EDEF"
              strokeWidth="4"
            />
            {/* Chat bubbles inside illustration */}
            <rect x="130" y="140" width="100" height="30" rx="15" fill="#25D366" fillOpacity="0.8" />
            <rect x="130" y="185" width="80" height="30" rx="15" fill="#34B7F1" fillOpacity="0.8" />
            <circle cx="150" cy="155" r="3" fill="white" />
            <circle cx="160" cy="155" r="3" fill="white" />
            <circle cx="170" cy="155" r="3" fill="white" />
            <circle cx="150" cy="200" r="3" fill="white" />
            <circle cx="160" cy="200" r="3" fill="white" />
            <circle cx="170" cy="200" r="3" fill="white" />
          </svg>
        </div>

        <h2 className="text-3xl font-light text-gray-700 mb-3">WhatsApp Web</h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-8">
          Send and receive messages without keeping your phone online.<br />
          Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
        </p>

        <div className="flex items-center gap-2 text-xs text-gray-400 border-t border-gray-200 pt-6 w-full justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span>End-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
}
