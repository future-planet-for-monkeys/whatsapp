import React, { useEffect } from 'react';

export interface ActionItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface ActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  actions: ActionItem[];
}

export default function ActionMenu({
  isOpen,
  onClose,
  title,
  subtitle,
  actions,
}: ActionMenuProps): React.ReactElement | null {
  // Prevent background scrolling when the menu is open
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-40 transition-opacity duration-200 animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet / Modal */}
      <div
        className="relative w-full bg-white rounded-t-2xl shadow-xl transition-all duration-200 transform translate-y-0 sm:max-w-sm sm:rounded-2xl overflow-hidden z-10 animate-slide-up sm:animate-scale-in"
      >
        {/* Drag handle for mobile */}
        <div className="flex justify-center py-2.5 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        {(title || subtitle) && (
          <div className="px-4 pb-3 pt-1 sm:pt-3 border-b border-gray-100 select-none">
            {title && <h4 className="text-sm font-semibold text-gray-900 truncate">{title}</h4>}
            {subtitle && <p className="text-xs text-gray-500 truncate mt-0.5">{subtitle}</p>}
          </div>
        )}

        {/* Actions List */}
        <div className="py-1.5 max-h-[60vh] overflow-y-auto">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick();
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors duration-150 hover:bg-gray-50 active:bg-gray-100 select-none ${
                action.danger ? 'text-red-600' : 'text-gray-700'
              }`}
            >
              <span className={`shrink-0 ${action.danger ? 'text-red-500' : 'text-gray-400'}`}>
                {action.icon}
              </span>
              <span className="font-medium">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Cancel Button for Mobile */}
        <div className="border-t border-gray-100 p-2 sm:hidden">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-center text-sm font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors duration-150 select-none"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
