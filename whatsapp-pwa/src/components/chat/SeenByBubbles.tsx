import React from 'react';

interface SeenByBubblesProps {
  users: { userId: string; name: string }[];
}

export default function SeenByBubbles({ users }: SeenByBubblesProps): React.ReactElement | null {
  if (!users || users.length === 0) return null;

  // Generate a consistent background color based on the name (matching Avatar.tsx)
  const getBgColor = (str: string | null | undefined): string => {
    if (!str) return 'bg-gray-500';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      'bg-red-500',
      'bg-orange-500',
      'bg-amber-500',
      'bg-yellow-600',
      'bg-green-500',
      'bg-emerald-500',
      'bg-teal-500',
      'bg-cyan-500',
      'bg-sky-500',
      'bg-blue-500',
      'bg-indigo-500',
      'bg-violet-500',
      'bg-purple-500',
      'bg-fuchsia-500',
      'bg-pink-500',
      'bg-rose-500',
    ];
    const index = Math.abs(hash) % colors.length;
    return colors[index] || 'bg-gray-500';
  };

  const visibleUsers = users.slice(0, 3);
  const overflowCount = users.length - 3;

  return (
    <div className="flex items-center -space-x-1 select-none" title={`Seen by: ${users.map(u => u.name).join(', ')}`}>
      {visibleUsers.map((user, index) => {
        const firstLetter = user.name?.[0]?.toUpperCase() || '?';
        const bgColor = getBgColor(user.name);
        return (
          <div
            key={user.userId || index}
            className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold border border-white shadow-sm shrink-0 ${bgColor}`}
            style={{ zIndex: 10 - index }}
          >
            {firstLetter}
          </div>
        );
      })}
      {overflowCount > 0 && (
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center bg-gray-400 text-white text-[7px] font-bold border border-white shadow-sm shrink-0"
          style={{ zIndex: 5 }}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
}
